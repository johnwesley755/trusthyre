import { Context } from 'hono';
import { State, City } from 'country-state-city';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { cacheService } from '../services/cache/cacheService';
import { CacheKeys } from '../services/cache/cacheKeys';
import { CacheTTL } from '../services/cache/cacheTTL';

export const getStates = async (c: Context) => {
  try {
    const states = await cacheService.getOrLoad(
      CacheKeys.locationStates(),
      CacheTTL.locationStates,
      async () => {
        // 1. Get all 36 States & Union Territories of India from country-state-city
        const cscStates = State.getStatesOfCountry('IN').map(s => s.name);

        // 2. Fetch any additional custom or existing states from database
        let dbStates: string[] = [];
        try {
          const records = await prisma.location_master.findMany({
            select: { state: true },
            distinct: ['state'],
            orderBy: { state: 'asc' }
          });
          dbStates = records.map(r => r.state).filter(Boolean);
        } catch (e: any) {
          console.warn('DB states fetch fallback:', e.message);
        }

        // Combine, deduplicate, and sort alphabetically
        return Array.from(new Set([...cscStates, ...dbStates])).filter(Boolean).sort((a, b) => a.localeCompare(b));
      }
    );

    return c.json(ApiResponse.ok(states));
  } catch (err: any) {
    console.error('Error in getStates:', err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getDistricts = async (c: Context) => {
  try {
    const state = c.req.query('state')?.trim();
    if (!state) {
      return c.json(ApiResponse.error('State parameter is required'), 400 as any);
    }

    const districts = await cacheService.getOrLoad(
      CacheKeys.locationDistricts(state),
      CacheTTL.locationDistricts,
      async () => {
        // 1. Find state object from country-state-city
        const indianStates = State.getStatesOfCountry('IN');
        const matchedState = indianStates.find(
          s => s.name.toLowerCase() === state.toLowerCase() ||
               s.isoCode.toLowerCase() === state.toLowerCase() ||
               state.toLowerCase().includes(s.name.toLowerCase())
        );

        let cscCities: string[] = [];
        if (matchedState) {
          cscCities = City.getCitiesOfState('IN', matchedState.isoCode).map(c => c.name);
        }

        // 2. Fetch any seeded or cached districts from database
        let dbDistricts: string[] = [];
        try {
          const records = await prisma.location_master.findMany({
            where: {
              state: { equals: state, mode: 'insensitive' }
            },
            select: { district: true },
            distinct: ['district'],
            orderBy: { district: 'asc' }
          });
          dbDistricts = records.map(r => r.district).filter(Boolean);
        } catch (e: any) {
          console.warn('DB districts fetch fallback:', e.message);
        }

        // Combine, deduplicate, clean up, and sort
        return Array.from(new Set([...cscCities, ...dbDistricts]))
          .map(d => d.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      }
    );

    return c.json(ApiResponse.ok(districts));
  } catch (err: any) {
    console.error('Error in getDistricts:', err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getLocalities = async (c: Context) => {
  try {
    const state = c.req.query('state')?.trim();
    const district = c.req.query('district')?.trim();
    const q = c.req.query('q')?.trim();

    if (!district) {
      return c.json(ApiResponse.error('District parameter is required'), 400 as any);
    }

    const whereClause: any = {
      district: { equals: district, mode: 'insensitive' }
    };

    if (state) {
      whereClause.state = { equals: state, mode: 'insensitive' };
    }

    if (q && q.length > 0) {
      whereClause.OR = [
        { locality_name: { contains: q, mode: 'insensitive' } },
        { taluk: { contains: q, mode: 'insensitive' } },
        { pincode: { contains: q } }
      ];
    }

    const records = await prisma.location_master.findMany({
      where: whereClause,
      select: {
        locality_name: true,
        locality_type: true,
        taluk: true,
        pincode: true
      },
      orderBy: [
        { taluk: 'asc' },
        { locality_name: 'asc' }
      ],
      take: 100
    });

    // Return deduplicated, clean objects
    const seen = new Set<string>();
    const localities = records.filter(r => {
      const key = `${r.locality_name}__${r.taluk || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(r => ({
      name: r.locality_name,
      type: r.locality_type,
      taluk: r.taluk,
      pincode: r.pincode
    }));

    return c.json(ApiResponse.ok(localities));
  } catch (err: any) {
    console.error('Error in getLocalities:', err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const lookupPincode = async (c: Context) => {
  try {
    const pincode = c.req.param('pincode')?.trim();
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return c.json(ApiResponse.error('Valid 6-digit PIN code required'), 400 as any);
    }

    // 1. Check database first
    const existing = await prisma.location_master.findMany({
      where: { pincode },
      take: 20
    });

    if (existing.length > 0) {
      const first = existing[0];
      return c.json(ApiResponse.ok({
        pincode,
        state: first.state,
        district: first.district,
        taluk: first.taluk,
        localities: existing.map(e => ({
          name: e.locality_name,
          type: e.locality_type,
          taluk: e.taluk,
          pincode: e.pincode
        }))
      }));
    }

    // 2. Query India Post API dynamically if not yet in DB
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
        headers: { 'Accept': 'application/json' }
      });
      const data: any = await res.json();

      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice)) {
        const postOffices = data[0].PostOffice;
        const first = postOffices[0];
        const state = first.State;
        const district = first.District;
        const taluk = first.Block !== 'NA' ? first.Block : first.Division;

        const localities = postOffices.map((po: any) => ({
          name: po.Name,
          type: po.BranchType?.toUpperCase().includes('HEAD') ? 'CORPORATION' : 'TOWN_PANCHAYAT',
          taluk: po.Block !== 'NA' ? po.Block : taluk,
          pincode: po.Pincode || pincode
        }));

        // Asynchronously save to location_master for future instant lookups
        const creates = localities.map((loc: any) => ({
          state,
          district,
          taluk: loc.taluk,
          locality_name: loc.name,
          locality_type: loc.type,
          pincode
        }));

        prisma.location_master.createMany({
          data: creates,
          skipDuplicates: true
        }).catch(e => console.warn('Could not cache postal pincode lookup:', e.message));

        return c.json(ApiResponse.ok({
          pincode,
          state,
          district,
          taluk,
          localities
        }));
      }
    } catch (apiErr: any) {
      console.warn('India Post API error:', apiErr.message);
    }

    return c.json(ApiResponse.error('Pincode details not found'), 404 as any);
  } catch (err: any) {
    console.error('Error in lookupPincode:', err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const searchPlaces = async (c: Context) => {
  try {
    const q = c.req.query('q')?.trim();
    if (!q || q.length < 2) {
      return c.json(ApiResponse.ok([]));
    }

    const matches = await prisma.location_master.findMany({
      where: {
        OR: [
          { locality_name: { contains: q, mode: 'insensitive' } },
          { taluk: { contains: q, mode: 'insensitive' } },
          { district: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 15,
      orderBy: { locality_name: 'asc' }
    });

    const results = matches.map(m => ({
      name: m.locality_name,
      taluk: m.taluk,
      district: m.district,
      state: m.state,
      pincode: m.pincode,
      type: m.locality_type
    }));

    return c.json(ApiResponse.ok(results));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const reverseGeocode = async (c: Context) => {
  try {
    const lat = c.req.query('lat');
    const lng = c.req.query('lng') || c.req.query('lon');
    if (!lat || !lng) {
      return c.json(ApiResponse.error('lat and lng query parameters are required'), 400 as any);
    }

    let state = '';
    let district = '';
    let taluk = '';
    let locality = '';
    let pincode = '';
    let formattedAddress = '';

    // 1. Try BigDataCloud reverse geocode (fast, high uptime, accurate Indian administrative hierarchy)
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { headers: { 'User-Agent': 'TrustHyre-App/1.0' } }
      );
      if (bdcRes.ok) {
        const bdcData: any = await bdcRes.json();
        state = bdcData.principalSubdivision || '';
        district = bdcData.localityInfo?.administrative?.find((a: any) => a.adminLevel === 6 || a.adminLevel === 5)?.name || bdcData.city || '';
        locality = bdcData.locality || bdcData.localityInfo?.administrative?.find((a: any) => a.adminLevel === 8 || a.adminLevel === 7)?.name || '';
        pincode = bdcData.postcode || '';
        formattedAddress = [locality, district, state, pincode].filter(Boolean).join(', ');
      }
    } catch (e: any) {
      console.warn('BigDataCloud reverse geocode error:', e.message);
    }

    // 2. OpenStreetMap Nominatim fallback with proper server User-Agent header
    if (!pincode || !state) {
      try {
        const osmRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'TrustHyre-App-Server/1.0 (contact@trusthyre.com)' } }
        );
        if (osmRes.ok) {
          const osmData: any = await osmRes.json();
          if (osmData?.address) {
            const addr = osmData.address;
            state = state || addr.state || '';
            district = district || addr.state_district || addr.county || addr.city || '';
            taluk = taluk || addr.county || addr.town || '';
            locality = locality || addr.suburb || addr.neighbourhood || addr.village || addr.road || '';
            pincode = pincode || (addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '');
            formattedAddress = formattedAddress || osmData.display_name || '';
          }
        }
      } catch (e: any) {
        console.warn('Nominatim reverse geocode error:', e.message);
      }
    }

    // Clean up district name (e.g., "Chennai District" -> "Chennai")
    district = district.replace(/\s+district$/i, '').trim();

    // Standardize State and District against country-state-city
    const indianStates = State.getStatesOfCountry('IN');
    const matchedState = indianStates.find(
      s => s.name.toLowerCase() === state.toLowerCase() ||
           state.toLowerCase().includes(s.name.toLowerCase()) ||
           s.name.toLowerCase().includes(state.toLowerCase())
    );
    if (matchedState) {
      state = matchedState.name;
      const cities = City.getCitiesOfState('IN', matchedState.isoCode);
      const matchedCity = cities.find(
        c => c.name.toLowerCase() === district.toLowerCase() ||
             district.toLowerCase().includes(c.name.toLowerCase()) ||
             c.name.toLowerCase().includes(district.toLowerCase())
      );
      if (matchedCity) {
        district = matchedCity.name;
      }
    }

    // Enrich with India Post API if valid 6-digit PIN code found
    let localities: any[] = [];
    if (pincode && /^\d{6}$/.test(pincode)) {
      try {
        const poRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const poData: any = await poRes.json();
        if (Array.isArray(poData) && poData[0]?.Status === 'Success' && Array.isArray(poData[0]?.PostOffice)) {
          const postOffices = poData[0].PostOffice;
          if (!district && postOffices[0]?.District) district = postOffices[0].District;
          if (!state && postOffices[0]?.State) state = postOffices[0].State;
          if (!taluk && postOffices[0]?.Block && postOffices[0].Block !== 'NA') taluk = postOffices[0].Block;
          localities = postOffices.map((po: any) => ({
            name: po.Name,
            type: po.BranchType?.toUpperCase().includes('HEAD') ? 'CORPORATION' : 'TOWN_PANCHAYAT',
            taluk: po.Block !== 'NA' ? po.Block : taluk,
            pincode
          }));
          if (!locality && postOffices[0]?.Name) {
            locality = postOffices[0].Name;
          }
        }
      } catch (e: any) {
        console.warn('India Post API enrichment error:', e.message);
      }
    }

    return c.json(ApiResponse.ok({
      state,
      district,
      taluk: taluk || locality,
      locality,
      townPanchayat: locality,
      pincode,
      localities,
      formattedAddress
    }));
  } catch (err: any) {
    console.error('Error in reverseGeocode:', err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
