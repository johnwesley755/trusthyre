// Catalog of districts and taluks mapped dynamically by city/region
export interface DistrictTalukData {
  district: string;
  aliases: string[];
  taluks: string[];
}

export const REGIONAL_DISTRICTS_TALUKS: DistrictTalukData[] = [
  {
    district: 'Chennai',
    aliases: ['chennai', 'madras'],
    taluks: ['Guindy', 'Ambattur', 'Alandur', 'Egmore', 'Mylapore', 'Perambur', 'Tondiarpet', 'Velachery', 'Sholinganallur', 'Aminjikarai', 'Ayanavaram', 'Madhavaram', 'Thiruvottiyur']
  },
  {
    district: 'Coimbatore',
    aliases: ['coimbatore', 'kovai'],
    taluks: ['Coimbatore North', 'Coimbatore South', 'Pollachi', 'Sulur', 'Mettupalayam', 'Annur', 'Kinathukadavu', 'Perur', 'Madukkarai', 'Valparai']
  },
  {
    district: 'Kanchipuram',
    aliases: ['kanchipuram', 'kancheepuram', 'sriperumbudur'],
    taluks: ['Sriperumbudur', 'Kanchipuram', 'Walajabad', 'Kundrathur', 'Uthiramerur']
  },
  {
    district: 'Chengalpattu',
    aliases: ['chengalpattu', 'chengalpet', 'tambaram', 'pallavaram'],
    taluks: ['Tambaram', 'Pallavaram', 'Chengalpattu', 'Vandalur', 'Thiruporur', 'Maduranthakam', 'Cheyyur']
  },
  {
    district: 'Tiruvallur',
    aliases: ['tiruvallur', 'thiruvallur', 'avadi', 'poonamallee'],
    taluks: ['Avadi', 'Poonamallee', 'Tiruvallur', 'Gummidipoondi', 'Ponneri', 'Tiruttani', 'Uthukkottai']
  },
  {
    district: 'Madurai',
    aliases: ['madurai'],
    taluks: ['Madurai North', 'Madurai South', 'Madurai East', 'Madurai West', 'Melur', 'Thirumangalam', 'Vadipatti', 'Usilampatti', 'Peraiyur', 'Thiruparankundram']
  },
  {
    district: 'Salem',
    aliases: ['salem'],
    taluks: ['Salem', 'Salem South', 'Salem West', 'Attur', 'Mettur', 'Omalur', 'Sankari', 'Yercaud', 'Gangavalli', 'Valapady', 'Kadayampatti', 'Edappadi']
  },
  {
    district: 'Tiruchirappalli',
    aliases: ['tiruchirappalli', 'trichy'],
    taluks: ['Trichy East', 'Trichy West', 'Srirangam', 'Manapparai', 'Lalgudi', 'Thuraiyur', 'Musiri', 'Manachanallur', 'Thottiyam', 'Marungapuri']
  },
  {
    district: 'Tirupur',
    aliases: ['tirupur', 'tiruppur'],
    taluks: ['Tirupur North', 'Tirupur South', 'Avinashi', 'Palladam', 'Dharapuram', 'Udumalaipettai', 'Kangeyam', 'Madathukulam']
  },
  {
    district: 'Bengaluru',
    aliases: ['bengaluru', 'bangalore'],
    taluks: ['Bengaluru North', 'Bengaluru South', 'Bengaluru East', 'Anekal', 'Yelahanka', 'Whitefield', 'Electronic City', 'Peenya', 'Kengeri']
  },
  {
    district: 'Hyderabad',
    aliases: ['hyderabad', 'secunderabad'],
    taluks: ['Secunderabad', 'Madhapur', 'Gachibowli', 'Kukatpally', 'Ameerpet', 'Balanagar', 'Charminar', 'Uppal', 'Malkajgiri']
  },
  {
    district: 'Mumbai',
    aliases: ['mumbai', 'bombay', 'navi mumbai', 'thane'],
    taluks: ['Andheri', 'Bandra', 'Kurla', 'Borivali', 'Thane', 'Vashi', 'Belapur', 'Dadar', 'Panvel']
  },
  {
    district: 'Delhi NCR',
    aliases: ['delhi', 'new delhi', 'noida', 'gurugram', 'gurgaon', 'faridabad', 'ghaziabad'],
    taluks: ['South Delhi', 'North Delhi', 'Gurugram', 'Noida', 'Greater Noida', 'Faridabad', 'Ghaziabad', 'Dwarka', 'Okhla']
  }
];

export function getTaluksForCity(city: string | null | undefined): string[] {
  if (!city || !city.trim()) return [];
  const normalized = city.trim().toLowerCase();
  
  const found = REGIONAL_DISTRICTS_TALUKS.find(item => 
    item.district.toLowerCase() === normalized ||
    item.aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))
  );

  return found ? found.taluks : [];
}
