import re
from typing import Tuple, Optional

# White-collar corporate, tech, finance, legal, management, and executive terms
WHITE_COLLAR_PATTERNS = [
    # 1. Management & Leadership Roles (Reject bare "manager", "head", "lead", "director", etc.)
    r"\bmanager\b",
    r"\bmanagement\b",
    r"\bhead\b",
    r"\blead\b",
    r"\bleader\b",
    r"\bdirector\b",
    r"\bvice\s+president\b",
    r"\bvp\b",
    r"\bceo\b",
    r"\bcto\b",
    r"\bcfo\b",
    r"\bcoo\b",
    r"\bpresident\b",
    r"\bprincipal\b",
    r"\bsenior\b",
    r"\bsr\.?\b",

    # 2. Corporate Desk, Consulting, Analysis & Coordination Roles
    r"\banalyst\b",
    r"\bconsultant\b",
    r"\barchitect\b",
    r"\badministrat(?:or|ive)\b",
    r"\bstrateg(?:y|ist)\b",
    r"\bspecialist\b",
    r"\bcoordinator\b",
    r"\bplanner\b",
    r"\bteam\s+member\b",

    # 3. IT, Software Engineering & Tech
    r"\bsoftware\b",
    r"\bdeveloper\b",
    r"\bprogrammer\b",
    r"\bcoder\b",
    r"\bfrontend\b",
    r"\bbackend\b",
    r"\bfullstack\b",
    r"\bfull-stack\b",
    r"\bcloud\b",
    r"\bdevops\b",
    r"\bsre\b",
    r"\bdata\s*(?:scientist|engineer|analyst)\b",
    r"\bai\b",
    r"\bml\b",
    r"\bmachine\s+learning\b",
    r"\bdeep\s+learning\b",
    r"\bqa\b",
    r"\btest\s+engineer\b",
    r"\bsecurity\s+engineer\b",
    r"\bpython\b",
    r"\bjava\b",
    r"\breact\b",
    r"\bnode\.?js\b",
    r"\bpresales\b",
    r"\bpre-sales\b",
    r"\berp\b",
    r"\bsap\b",
    r"\bsalesforce\b",
    r"\bcrm\b",
    r"\bit\s+infra\b",
    r"\bdatabase\b",
    r"\bdba\b",
    r"\bscrum\s+master\b",
    r"\bbim\b",
    r"\bcad\b",

    # 4. HR, Talent, Recruitment & Corporate Office
    r"\bhuman\s*resources\b",
    r"\bhr\b",
    r"\btalent\b",
    r"\brecruiter\b",
    r"\brecruitment\b",
    r"\bonboarding\s+specialist\b",

    # 5. Finance, Banking, Accounting & Legal
    r"\bchartered\s+accountant\b",
    r"\baccountant\b",
    r"\bauditor\b",
    r"\baudit\b",
    r"\bbookkeeper\b",
    r"\blegal\b",
    r"\blawyer\b",
    r"\badvocate\b",
    r"\bcounsel\b",
    r"\bcompliance\b",
    r"\benforcement\b",
    r"\bbanking\b",
    r"\bwealth\b",
    r"\bportfolio\b",
    r"\bmortgage\b",
    r"\bhousing\s+finance\b",
    r"\bunderwrit(?:er|ing)\b",
    r"\bcredit\s+analyst\b",
    r"\brelationship\s+manager\b",

    # 6. Corporate Sales, Accounts & Marketing
    r"\baccount\s+executive\b",
    r"\bbusiness\s+development\b",
    r"\benterprise\s+sales\b",
    r"\bkey\s+accounts?\b",
    r"\bmarketing\b",
    r"\bdigital\s+marketing\b",
    r"\bseo\b",
    r"\bcontent\s+writer\b",
    r"\bcopywriter\b",
    r"\bgraphic\s+designer\b",
    r"\bui/ux\b",
    r"\bproduct\s+designer\b",

    # 7. Procurement, Sourcing & Contracts
    r"\bprocurement\b",
    r"\bsourcing\b",
    r"\bcontracts?\b",
    r"\bvendor\s+management\b",

    # 8. Corporate "Delivery" buzzwords that masquerade as logistics
    r"\bdelivery\s+(?:manager|head|lead|architect|analyst|operations|director|specialist)\b",
    r"\bpartner\s*-\s*hr\b",
    r"\bhr\s*(?:business\s*)?partner\b",
    r"\b(?:service|process|client|project|it|infra|learning)\s+delivery\b",
    r"\border\s+to\s+cash\b",
]

# Explicit Skilled Trade & Field Engineering (Permitted blue-collar / frontline roles)
PERMITTED_FIELD_ENGINEERING_PATTERNS = [
    r"\b(?:maintenance|service|field\s*service|field|site|civil\s+site)\s+engineer\b",
    r"\b(?:electrical|mechanical|plant|boiler|lift|elevator|ac|hvac|chiller|refrigeration)\s+(?:maintenance\s+)?engineer\b",
    r"\b(?:customer\s+support|hardware\s+support|desktop\s+support)\s+engineer\b",
]

# Explicit blue-collar frontline, manual, operations, logistics & skilled trades
# NOTE: Avoid isolated generic words like bare "delivery", "security", "clean" or "driver"
BLUE_COLLAR_PATTERNS = [
    # Logistics, Delivery & Driving (Compound, unambiguous terms)
    r"\b(?:grocery\s+delivery\s+partner|delivery\s+(?:boy|partner|rider|associate|agent|executive|driver|courier))\b",
    r"\b(?:bike|motorcycle|scooter|auto|van|truck|bus|cab|car|commercial)\s+(?:rider|driver|pilot)\b",
    r"\b(?:courier\s+(?:rider|delivery|executive|agent))\b",
    r"\buber\s+bike\s+rider\b",
    r"\brider\b",
    r"\bdriver\b",
    r"\bchauffeur\b",
    r"\bvalet\b",
    r"\bforklift\s+(?:driver|operator)\b",

    # Warehouse, Factory & Manual
    r"\b(?:warehouse\s+(?:associate|worker|helper|picker|packer|sorter|assistant|loader|inventory\s+assistant))\b",
    r"\b(?:picker\s*(?:/|&|\band\b)?\s*packer)\b",
    r"\bpicker\b",
    r"\bpacker\b",
    r"\bloader\b",
    r"\bunloader\b",
    r"\bsorter\b",
    r"\bmaterial\s+handler\b",
    r"\bfactory\s+worker\b",
    r"\blabour\b",
    r"\blaborer\b",
    r"\bhelper\b",
    r"\b(?:machine|cnc|lathe|press|molding|boiler|plant|pump)\s+operator\b",
    r"\bturner\b",
    r"\bmiller\b",
    r"\bmachinist\b",
    r"\btextile\s+worker\b",
    r"\bweaver\b",
    r"\bspinner\b",
    r"\btailor\b",
    r"\bsewing\s+machine\s+operator\b",

    # Security, Facility & Hospitality
    r"\b(?:security\s+guard|watchman|guard|bouncer|gatekeeper)\b",
    r"\bhousekeeping\b",
    r"\bcleaner\b",
    r"\bjanitor\b",
    r"\bsweeper\b",
    r"\boffice\s+boy\b",
    r"\bpantry\s+boy\b",
    r"\bpeon\b",
    r"\bcook\b",
    r"\bchef\s+helper\b",
    r"\bkitchen\s+(?:steward|helper|assistant)\b",
    r"\bwaiter\b",
    r"\bsteward\b",

    # Skilled Trades, ITI & Field Services
    r"\belectrician\b",
    r"\bwireman\b",
    r"\bplumb(?:er|ing)\b",
    r"\bpipe\s*(?:fitter|fitting)\b",
    r"\bcarpenter\b",
    r"\bwelder\b",
    r"\bpainter\b",
    r"\bmason\b",
    r"\bfitter\b",
    r"\bmechanic\b",
    r"\b(?:ac|hvac|refrigeration|ro|cctv|appliance|lift|elevator|motor|water\s+filtration|plumbing|pipe\s*fitting)\s+technician\b",
    r"\bfield\s+service\s+technician\b",
    r"\biti\b",

    # Construction & Site
    r"\bscaffolder\b",
    r"\bsite\s+worker\b",
    r"\bbar\s*bender\b",

    # Field Frontline Sales/Service
    r"\bfield\s+(?:sales|service)\s+(?:officer|executive|associate)\b",
    r"\bsales\s+man\s+and\s+delivery\s+boy\b",
]

compiled_white_collar = [re.compile(p, re.IGNORECASE) for p in WHITE_COLLAR_PATTERNS]
compiled_field_eng = [re.compile(p, re.IGNORECASE) for p in PERMITTED_FIELD_ENGINEERING_PATTERNS]
compiled_blue_collar = [re.compile(p, re.IGNORECASE) for p in BLUE_COLLAR_PATTERNS]

# Explicit frontline high-confidence phrases for description fallback
EXPLICIT_FRONTLINE_DESC_PATTERNS = [
    r"\b(?:two\s*wheeler|own\s+bike|driving\s*licen[sc]e|petrol\s+allowance|fuel\s+allowance)\b",
    r"\b(?:loading\s+and\s+unloading|order\s+picking|box\s+packing|warehouse\s+duties)\b",
    r"\b(?:10th\s+pass|12th\s+pass|iti\s+pass|iti\s+fitter|iti\s+electrician)\b",
    r"\b(?:food\s+delivery|grocery\s+delivery|swiggy|zomato|blinkit|zepto|shadowfax|bigbasket|porter)\b",
    r"\b(?:residential\s+and\s+commercial\s+water\s+filtration|plumbing\s+installation)\b",
    r"\b(?:hvac\s+and\s+panel\s+wiring|commercial\s+electrician)\b",
]
compiled_frontline_desc = [re.compile(p, re.IGNORECASE) for p in EXPLICIT_FRONTLINE_DESC_PATTERNS]


class BlueCollarClassifier:
    """
    Strict classifier ensuring ONLY genuine blue-collar jobs are approved,
    and white-collar / office jobs are systematically rejected, while preserving
    legitimate frontline field/maintenance/site engineering roles.
    """

    @classmethod
    def evaluate(cls, title: str, description: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        t_clean = (title or "").lower().strip()

        # 1. Check if title matches legitimate Field/Maintenance Engineering first
        is_permitted_eng = any(p.search(t_clean) for p in compiled_field_eng)

        # 2. Check for immediate white-collar disqualifiers in title
        if not is_permitted_eng:
            for pattern in compiled_white_collar:
                if pattern.search(t_clean):
                    return False, f"Rejected: matched white-collar pattern '{pattern.pattern}' in title"

            # Bare "Engineer" check: If title contains engineer and wasn't in permitted field trades
            if re.search(r"\bengineer\b", t_clean) and not is_permitted_eng:
                return False, "Rejected: generic/corporate engineering title not in permitted field trades"

        # 3. Check for positive blue-collar qualification in title
        has_blue_collar_title = is_permitted_eng or any(p.search(t_clean) for p in compiled_blue_collar)

        # 4. If title qualified as blue-collar, verify description doesn't explicitly mandate white-collar degrees
        if has_blue_collar_title:
            if description:
                desc_lower = description.lower()[:1000]
                corporate_hard_stops = [
                    r"\bmaster\s+of\s+business\s+administration\b",
                    r"\bmba\s+mandatory\b",
                    r"\bchartered\s+accountant\b",
                    r"\bb\.?tech\s+in\s+computer\s+science\b",
                    r"\bsoftware\s+development\s+lifecycle\b",
                    r"\bcorporate\s+banking\b",
                    r"\blea\s+notices\b",
                    r"\border-to-cash\b",
                    r"\border\s+to\s+cash\b",
                    r"\bsap\s+(?:sd|mm|fi|co)\b",
                    r"\bpre-sales\s+bid\b",
                ]
                for p_stop in corporate_hard_stops:
                    if re.search(p_stop, desc_lower):
                        return False, f"Rejected: description requires white-collar credential '{p_stop}'"
            return True, None

        # 5. Fallback: only if title was generic (e.g. "Associate", "Staff Member", "Partner"),
        # require explicit, high-confidence frontline trade indicators in description
        if description:
            desc_lower = description.lower()
            # If description matches white-collar patterns, immediate reject
            for pattern in compiled_white_collar:
                if pattern.search(desc_lower[:500]):
                    return False, "Rejected: matched white-collar pattern in description"

            # Must match explicit frontline duties (not just isolated single words)
            if any(p.search(desc_lower) for p in compiled_frontline_desc):
                return True, None

        return False, "Rejected: does not match any recognized blue-collar role keywords"
