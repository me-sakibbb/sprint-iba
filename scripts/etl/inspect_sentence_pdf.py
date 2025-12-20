import pdfplumber

pdf_path = r"C:\Users\DCL\Downloads\501-Sentence-Completion-Questions-1 (1).pdf"

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total Pages: {len(pdf.pages)}")
    for i in range(min(5, len(pdf.pages))):
        print(f"--- Page {i+1} ---")
        print(pdf.pages[i].extract_text())
        print("\n")
    
    # Check the last few pages for answers
    print("--- Last 5 Pages ---")
    for i in range(max(0, len(pdf.pages)-5), len(pdf.pages)):
        print(f"--- Page {i+1} ---")
        print(pdf.pages[i].extract_text())
        print("\n")
