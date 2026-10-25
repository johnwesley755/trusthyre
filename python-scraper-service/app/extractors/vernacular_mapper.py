"""
Vernacular Trade Title Mapper
Inspired by Sahayak-RAG (map.py), this module provides a bidirectional, zero-latency in-memory
mapping between colloquial Indian trade search terms in Tamil (தமிழ்), Hindi (हिन्दी), and English,
and standardized industrial job search taxonomies for blue-collar recruitment.
"""

from typing import List, Dict, Optional, Set, Any
import re

# Standardized trade taxonomy categories
TRADE_TAXONOMY: Dict[str, Dict[str, Any]] = {
    "driver": {
        "en": ["driver", "delivery", "delivery driver", "delivery partner", "delivery executive", "delivery boy", "rider", "courier", "cab driver", "van driver", "auto driver"],
        "ta": ["ஓட்டுநர்", "ஓட்டுனர்", "டிரைவர்", "டெலிவரி", "ரைடர்", "ஆட்டோ டிரைவர்", "பைக் டிரைவர்"],
        "hi": ["चालक", "ड्राइवर", "डिलीवरी", "राइडर", "कूरियर", "ऑटो ड्राइवर", "बाइक ड्राइवर"],
        "search_keywords": ["Delivery Driver", "Delivery Partner", "Courier Rider", "Commercial Driver"],
        "category": "Logistics & Delivery"
    },
    "electrician": {
        "en": ["electrician", "wireman", "maintenance electrician", "electrical technician", "iti electrician"],
        "ta": ["எலக்ட்ரீசியன்", "மின்சார பணியாளர்", "வயரிங்", "எலக்ட்ரிக்கல்"],
        "hi": ["इलेक्ट्रीशियन", "बिजली मिस्त्री", "वायरमैन", "इलेक्ट्रिकल"],
        "search_keywords": ["Electrician", "Maintenance Electrician", "Wireman", "Electrical Technician"],
        "category": "Skilled Trades & ITI"
    },
    "technician": {
        "en": ["technician", "ac mechanic", "refrigeration technician", "service engineer", "maintenance technician", "ro technician", "field technician"],
        "ta": ["டெக்னீசியன்", "பழுதுபார்ப்பவர்", "மெக்கானிக்", "ஏசி மெக்கானிக்", "சர்வீஸ் டெக்னீசியன்"],
        "hi": ["तकनीशियन", "मैकेनिक", "एसी मैकेनिक", "सर्विस तकनीशियन", "मरम्मत कर्मी"],
        "search_keywords": ["Field Service Technician", "Maintenance Technician", "AC Mechanic", "Service Technician"],
        "category": "Field Services & Maintenance"
    },
    "warehouse": {
        "en": ["warehouse", "packer", "picker", "sorter", "loader", "material handler", "inventory assistant"],
        "ta": ["கிடங்கு", "பேக்கர்", "பிக்கர்", "லோடர்", "பொட்டலமிடுபவர்", "பொருட்கள் கையாளுபவர்"],
        "hi": ["गोदाम", "पैकर", "पिकर", "लोडर", "वेयरहाउस सहायक", "माल वाहक"],
        "search_keywords": ["Warehouse Associate", "Packer", "Picker", "Loader"],
        "category": "Warehouse & Logistics"
    },
    "security": {
        "en": ["security guard", "watchman", "security officer", "patrol", "gatekeeper", "bouncer"],
        "ta": ["காவலாளி", "செக்யூரிட்டி", "வாட்ச்மேன்", "பாதுகாவலர்"],
        "hi": ["सुरक्षा गार्ड", "चौकीदार", "सुरक्षा कर्मी", "गार्ड"],
        "search_keywords": ["Security Guard", "Watchman", "Facility Security"],
        "category": "Facility & Security"
    },
    "cook": {
        "en": ["cook", "chef", "kitchen helper", "commis", "south indian cook", "catering helper", "master"],
        "ta": ["சமையல்காரர்", "சமையல் மாஸ்டர்", "சமையலர்", "கிச்சன் ஹெல்ப்பர்"],
        "hi": ["रसोइया", "कुक", "बावर्ची", "किचन हेल्पर", "हलवाई"],
        "search_keywords": ["Cook", "Kitchen Assistant", "Chef de Partie", "Catering Staff"],
        "category": "Hospitality & Food Services"
    },
    "tailor": {
        "en": ["tailor", "sewing machine operator", "garment worker", "stitcher", "sampling tailor"],
        "ta": ["தையல்காரர்", "தையலர்", "ஆடை தையல்", "மெஷின் ஆபரேட்டர்"],
        "hi": ["दर्जी", "सिलाई मशीन ऑपरेटर", "टेलर", "गारमेंट वर्कर"],
        "search_keywords": ["Tailor", "Sewing Machine Operator", "Garment Stitcher"],
        "category": "Textile & Manufacturing"
    },
    "plumber": {
        "en": ["plumber", "pipe fitter", "sanitary worker", "plumbing technician"],
        "ta": ["பிளம்பர்", "குழாய் பொருத்துபவர்", "பிளம்பிங்"],
        "hi": ["प्लंबर", "नलसाज", "पाइप फिटर", "प्लंबिंग"],
        "search_keywords": ["Plumber", "Pipe Fitter", "Plumbing Technician"],
        "category": "Skilled Trades & ITI"
    },
    "housekeeping": {
        "en": ["housekeeping", "cleaner", "janitor", "sweeper", "office boy", "pantry boy", "helper"],
        "ta": ["தூய்மை பணியாளர்", "ஹவுஸ்கீப்பிங்", "துப்புரவாளர்", "ஆபீஸ் பாய்"],
        "hi": ["सफाई कर्मचारी", "हाउसकीपिंग", "स्वीपर", "ऑफिस बॉय", "हेल्पर"],
        "search_keywords": ["Housekeeping Staff", "Office Boy", "Cleaner", "Facility Attendant"],
        "category": "Facility Management"
    },
    "operator": {
        "en": ["cnc operator", "machine operator", "lathe operator", "fitter", "welder", "turner"],
        "ta": ["இயக்குனர்", "மெஷின் ஆபரேட்டர்", "சிஎன்சி ஆபரேட்டர்", "வெல்டர்", "பிட்டர்"],
        "hi": ["मशीन ऑपरेटर", "सीएनसी ऑपरेटर", "वेल्डर", "फिटर", "कारीगर"],
        "search_keywords": ["CNC Operator", "Machine Operator", "Welder", "Fitter"],
        "category": "Industrial & Manufacturing"
    }
}


class VernacularTradeMapper:
    """Zero-latency in-memory query translator and trade expander."""

    @classmethod
    def detect_trade(cls, text: str) -> Optional[str]:
        """Detects the normalized trade key from an English, Tamil, or Hindi input term."""
        if not text:
            return None
        cleaned = text.strip().lower()

        for trade_key, data in TRADE_TAXONOMY.items():
            # Check English variants
            for term in data["en"]:
                if term in cleaned:
                    return trade_key
            # Check Tamil variants
            for term in data["ta"]:
                if term in text:
                    return trade_key
            # Check Hindi variants
            for term in data["hi"]:
                if term in text:
                    return trade_key

        return None

    @classmethod
    def expand_query(cls, query: Optional[str], default_trade: Optional[str] = None) -> List[str]:
        """
        Expands user/admin query into high-precision industrial search terms for scrapers.
        If no query or trade is recognized, returns a balanced mix of priority blue-collar roles.
        """
        if not query and not default_trade:
            # Broad default blue-collar mix
            return [
                "Delivery Partner",
                "Warehouse Associate",
                "Electrician",
                "Field Service Technician",
                "Security Guard",
                "Cook",
                "Machine Operator"
            ]

        trade_key = cls.detect_trade(query or "") or cls.detect_trade(default_trade or "")

        if trade_key and trade_key in TRADE_TAXONOMY:
            return TRADE_TAXONOMY[trade_key]["search_keywords"]

        # If it's a specific custom English phrase, pass it as a single keyword
        return [query.strip()] if query and query.strip() else ["Blue Collar Associate"]

    @classmethod
    def get_category_for_trade(cls, text: str) -> str:
        """Returns the canonical industry category for a job title or vernacular text."""
        trade_key = cls.detect_trade(text)
        if trade_key and trade_key in TRADE_TAXONOMY:
            return TRADE_TAXONOMY[trade_key]["category"]
        return "Operations & Field Services"

    @classmethod
    def list_supported_trades(cls) -> List[Dict[str, str]]:
        """Returns trade list with vernacular names for frontend selection chips."""
        return [
            {"id": "driver", "en": "Delivery / Driver", "ta": "ஓட்டுநர் / டெலிவரி", "hi": "चालक / डिलीवरी"},
            {"id": "electrician", "en": "Electrician", "ta": "எலக்ட்ரீசியன்", "hi": "इलेक्ट्रीशियन"},
            {"id": "technician", "en": "Technician / AC", "ta": "டெக்னீசியன்", "hi": "तकनीशियन"},
            {"id": "warehouse", "en": "Warehouse / Packer", "ta": "கிடங்கு / பேக்கர்", "hi": "गोदाम / पैकर"},
            {"id": "security", "en": "Security Guard", "ta": "காவலாளி / செக்யூரிட்டி", "hi": "सुरक्षा गार्ड"},
            {"id": "cook", "en": "Cook / Kitchen Helper", "ta": "சமையல்காரர்", "hi": "रसोइया / कुक"},
            {"id": "tailor", "en": "Tailor / Garment", "ta": "தையல்காரர்", "hi": "दर्जी / टेलर"},
            {"id": "plumber", "en": "Plumber", "ta": "பிளம்பர்", "hi": "प्लंबर"},
            {"id": "housekeeping", "en": "Housekeeping / Cleaner", "ta": "தூய்மை பணியாளர்", "hi": "सफाई कर्मचारी"},
            {"id": "operator", "en": "Machine / CNC Operator", "ta": "மெஷின் ஆபரேட்டர்", "hi": "मशीन ऑपरेटर"},
        ]
