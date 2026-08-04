from pathlib import Path
import sys

BACKEND=Path(r"D:\Phong lam viec\03 Chinh sua van ban\loca_converter\backend")
sys.path.insert(0,str(BACKEND))

from services.pipeline.image_document_pipeline import ImageDocumentPipeline
from services.diagnostics.image_layout_diagnostic import ImageLayoutDiagnostic
import services.diagnostics.image_layout_diagnostic as diagnostic_module


def main():
    if len(sys.argv)<2:raise SystemExit("Usage: generate_image_layout_diagnostic.py <source-image>")
    source=Path(sys.argv[1]);diagnostic_module.STORAGE_DIR=Path(r"D:\Phong lam viec\LocaEditor_Frontend\artifacts")
    document=ImageDocumentPipeline().process(source,preserve_images=True,compare_layout=True)
    result=ImageLayoutDiagnostic().generate(document,"image-layout-diagnostic")
    print(result["layout_diagnostic_json"])
    for path in result["layout_overlay_paths"]:print(path)


if __name__=="__main__":main()
