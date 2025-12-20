from pypdf import PdfReader

PDF_PATH = r"C:\Users\DCL\Downloads\501-Sentence-Completion-Questions-1 (1).pdf"
reader = PdfReader(PDF_PATH)
text = ""
for page in reader.pages[:3]:
    text += page.extract_text() + "\n"

print(f"Extracted {len(text)} chars.")
print("First 500 chars:")
print(text[:500])
