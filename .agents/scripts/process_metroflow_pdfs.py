from pathlib import Path
import fitz

src = Path('attached_assets')
out = Path('.agents/outputs/metroflow-pdfs')
out.mkdir(parents=True, exist_ok=True)
for pdf in sorted(src.glob('*.pdf')):
    doc = fitz.open(pdf)
    stem = pdf.stem[:80]
    pdf_out = out / stem
    pdf_out.mkdir(exist_ok=True)
    text_parts = []
    for i, page in enumerate(doc):
        text_parts.append(f'\n--- PAGE {i+1} ---\n')
        text_parts.append(page.get_text())
        if i < 3:
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
            pix.save(pdf_out / f'page-{i+1}.png')
    (pdf_out / 'extracted.txt').write_text(''.join(text_parts), encoding='utf-8')
    print(f'{pdf.name}: {len(doc)} pages -> {pdf_out}')
