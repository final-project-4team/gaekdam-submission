import pdfplumber
from pathlib import Path
import re
import html

# Optional OCR imports (only if you installed pdf2image + pytesseract)
try:
    from pdf2image import convert_from_path
    import pytesseract
    OCR_AVAILABLE = True
except Exception:
    OCR_AVAILABLE = False

def clean_text(s: str) -> str:
    # HTML 엔티티 풀기
    s = html.unescape(s)

    # 일부 제어문자 제거(폼피드 등)
    s = s.replace("\x0c", " ")

    # 연속 공백/탭을 하나의 공백으로
    s = re.sub(r"[ \t]+", " ", s)

    # 여러 개의 연속된 개행을 2개로 축소
    s = re.sub(r"\n{3,}", "\n\n", s)

    # 비가시/바이너리 문자 제거하되, 유니코드(한글·일본어 등)는 유지
    s = re.sub(r"[^\t\n\r\x20-\x7E\u00A0-\uFFFF]+", " ", s)

    # 문자열 양끝 트림
    s = s.strip()
    return s

def extract_text_from_pdf(path: str) -> str:
    text_parts = []
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages):
            txt = page.extract_text() or ""
            if txt and txt.strip():
                text_parts.append(f"[PAGE {i+1}]\n" + txt)

    # 만약 pdfplumber로 텍스트를 못 뽑았고 OCR 사용 가능하면 OCR 폴백
    if not text_parts and OCR_AVAILABLE:
        try:
            pages = convert_from_path(path, dpi=200)
            ocr_parts = []
            for i, img in enumerate(pages):
                txt = pytesseract.image_to_string(img, lang='kor+eng')  # 필요시 언어 변경
                if txt and txt.strip():
                    ocr_parts.append(f"[PAGE {i+1}]\n" + txt)
            text_parts = ocr_parts
        except Exception:
            # OCR 실패 시 그냥 빈 문자열로 둠
            text_parts = []

    joined = "\n\n".join(text_parts)
    return clean_text(joined)