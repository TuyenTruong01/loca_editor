from pathlib import Path
import shutil
import sys

ROOT=Path(__file__).resolve().parents[1]
BACKEND=Path(r"D:\Phong lam viec\03 Chinh sua van ban\loca_converter\backend")
SOURCE=Path(r"C:\Users\Coding\Downloads\Telegram Desktop\1220922-0101_trang_1-27_cut.pdf.pdf")
OUTPUT=ROOT/"artifacts"/"loca-document-table-reconstruction.docx"
sys.path.insert(0,str(BACKEND))

import services.exporters.docx_exporter as exporter_module
from services.exporters.docx_exporter import DocxExporter
from services.pdf.pdf_parser import PDFParser


def main():
    exporter_module.STORAGE_DIR=ROOT/".runtime"/"table-export"
    document=PDFParser().parse(SOURCE)
    table=document.pages[0].tables[0]
    if table["rows"]!=[["Step","Bolt No.","To dimension"],["1","1-2-3-4","1.05 A"],["2","1-2 or 3-4","Opening"]]:
        raise RuntimeError(f"Unexpected table reconstruction: {table['rows']}")
    generated=DocxExporter().export(document,"hybrid","sample")
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(generated,OUTPUT)
    print(OUTPUT)


if __name__=="__main__":
    main()
