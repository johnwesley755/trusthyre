import pytest
from app.extractors.vernacular_mapper import VernacularTradeMapper

def test_detect_trade_english():
    assert VernacularTradeMapper.detect_trade("delivery driver needed") == "driver"
    assert VernacularTradeMapper.detect_trade("Senior AC Mechanic") == "technician"
    assert VernacularTradeMapper.detect_trade("Warehouse Picker & Packer") == "warehouse"
    assert VernacularTradeMapper.detect_trade("CNC Operator Day Shift") == "operator"

def test_detect_trade_tamil():
    # ஓட்டுநர் -> driver
    assert VernacularTradeMapper.detect_trade("சென்னை ஓட்டுநர் வேலை") == "driver"
    # காவலாளி -> security
    assert VernacularTradeMapper.detect_trade("இரவு நேர காவலாளி தேவை") == "security"
    # தையல்காரர் -> tailor
    assert VernacularTradeMapper.detect_trade("ஆடை தையல்காரர் வேலை வாய்ப்பு") == "tailor"
    # சமையல்காரர் -> cook
    assert VernacularTradeMapper.detect_trade("ஹோட்டல் சமையல்காரர்") == "cook"

def test_detect_trade_hindi():
    # चालक -> driver
    assert VernacularTradeMapper.detect_trade("डिलीवरी चालक चाहिए") == "driver"
    # इलेक्ट्रीशियन -> electrician
    assert VernacularTradeMapper.detect_trade("अनुभवी इलेक्ट्रीशियन") == "electrician"
    # सफाई कर्मचारी -> housekeeping
    assert VernacularTradeMapper.detect_trade("ऑफिस सफाई कर्मचारी") == "housekeeping"

def test_expand_query_vernacular():
    # Tamil driver query expands to industrial search keywords
    keywords = VernacularTradeMapper.expand_query("ஓட்டுநர்")
    assert "Delivery Driver" in keywords
    assert "Delivery Partner" in keywords

    # Hindi warehouse query expands
    wh_keywords = VernacularTradeMapper.expand_query("गोदाम पैकर")
    assert "Warehouse Associate" in wh_keywords
    assert "Packer" in wh_keywords

def test_expand_query_fallback():
    # Empty query returns broad default mix
    defaults = VernacularTradeMapper.expand_query(None)
    assert len(defaults) >= 5
    assert "Delivery Partner" in defaults

    # Unknown custom query passes through
    custom = VernacularTradeMapper.expand_query("Forklift Supervisor")
    assert custom == ["Forklift Supervisor"]

def test_get_category_for_trade():
    assert VernacularTradeMapper.get_category_for_trade("ஓட்டுநர்") == "Logistics & Delivery"
    assert VernacularTradeMapper.get_category_for_trade("Wireman") == "Skilled Trades & ITI"
    assert VernacularTradeMapper.get_category_for_trade("Unknown Trade XYZ") == "Operations & Field Services"

def test_list_supported_trades():
    trades = VernacularTradeMapper.list_supported_trades()
    assert len(trades) >= 10
    driver_trade = next(t for t in trades if t["id"] == "driver")
    assert "ஓட்டுநர்" in driver_trade["ta"]
    assert "चालक" in driver_trade["hi"]
