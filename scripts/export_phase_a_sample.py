from pathlib import Path
import shutil
import sys

FRONTEND_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = Path(r"D:\Phong lam viec\03 Chinh sua van ban\loca_converter\backend")
SOURCE = Path(r"C:\Users\Coding\AppData\Local\Temp\codex-clipboard-bd968c81-0f7f-41e4-9117-9ea2136f971c.png")
OUTPUT = FRONTEND_ROOT / "artifacts" / "loca-document-phase-a.docx"

sys.path.insert(0, str(BACKEND_ROOT))

import services.exporters.image_docx_exporter as exporter_module
from services.exporters.image_docx_exporter import ImageDocxExporter
from services.pipeline.image_document_pipeline import ImageDocumentPipeline


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    export_root = FRONTEND_ROOT / ".runtime" / "phase-a-export"
    exporter_module.STORAGE_DIR = export_root
    document = ImageDocumentPipeline().process(SOURCE, preserve_images=True, compare_layout=True)
    generated = ImageDocxExporter().export(document, "editable", "sample")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(generated, OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
