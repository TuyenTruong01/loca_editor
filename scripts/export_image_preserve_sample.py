from pathlib import Path
import shutil
import sys

BACKEND = Path(r"D:\Phong lam viec\03 Chinh sua van ban\loca_converter\backend")
sys.path.insert(0, str(BACKEND))

from services.pipeline.image_document_pipeline import ImageDocumentPipeline
from services.exporters.image_docx_exporter import ImageDocxExporter
import services.exporters.image_preserve_layout_exporter as preserve_module


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: export_image_preserve_sample.py <source-image>")
    source = Path(sys.argv[1])
    if not source.exists():
        raise SystemExit(f"Image not found: {source}")
    preserve_module.STORAGE_DIR = Path(r"D:\Phong lam viec\LocaEditor_Frontend\.runtime\image-preserve-export")
    document = ImageDocumentPipeline().process(source, preserve_images=True, compare_layout=True)
    generated = ImageDocxExporter().export(document, "hybrid", "image-preserve-sample")
    target = Path(r"D:\Phong lam viec\LocaEditor_Frontend\artifacts\image-to-word-preserve-layout.docx")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(generated, target)
    print(target)


if __name__ == "__main__":
    main()
