// Catalog of major industrial districts and taluks in Tamil Nadu (Nithra Jobs model)
export interface DistrictTalukData {
  district: string;
  taluks: string[];
}

export const REGIONAL_DISTRICTS_TALUKS: DistrictTalukData[] = [
  {
    district: 'Chennai',
    taluks: ['Guindy', 'Ambattur', 'Alandur', 'Egmore', 'Mylapore', 'Perambur', 'Tondiarpet', 'Velachery', 'Sholinganallur']
  },
  {
    district: 'Coimbatore',
    taluks: ['Coimbatore North', 'Coimbatore South', 'Pollachi', 'Sulur', 'Mettupalayam', 'Annur', 'Kinathukadavu']
  },
  {
    district: 'Kanchipuram & Sriperumbudur',
    taluks: ['Sriperumbudur', 'Kanchipuram', 'Walajabad', 'Kundrathur', 'Uthiramerur']
  },
  {
    district: 'Chengalpattu',
    taluks: ['Chengalpattu', 'Tambaram', 'Pallavaram', 'Vandalur', 'Maduranthakam', 'Thiruporur', 'Cheyyur']
  },
  {
    district: 'Tiruvallur',
    taluks: ['Tiruvallur', 'Avadi', 'Poonamallee', 'Gummidipoondi', 'Ponneri', 'Tiruttani', 'Uthukkottai']
  },
  {
    district: 'Madurai',
    taluks: ['Madurai North', 'Madurai South', 'Melur', 'Thirumangalam', 'Vadipatti', 'Usilampatti']
  },
  {
    district: 'Salem',
    taluks: ['Salem', 'Attur', 'Mettur', 'Omalur', 'Sankari', 'Yercaud']
  },
  {
    district: 'Tiruchirappalli',
    taluks: ['Trichy East', 'Trichy West', 'Srirangam', 'Manapparai', 'Lalgudi', 'Thuraiyur']
  },
  {
    district: 'Tirupur',
    taluks: ['Tirupur North', 'Tirupur South', 'Avinashi', 'Palladam', 'Dharapuram', 'Udumalaipettai']
  }
];

