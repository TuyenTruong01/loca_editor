import { Clapperboard, Download, FileOutput, FileText, Gauge, Layers3, Scissors, VolumeX } from "lucide-react";

const videoFeatures = [
  { icon: <Download />, title: "Download video", text: "Download a video from a direct URL and choose between 720p, 1080p, or original quality." },
  { icon: <VolumeX />, title: "Separate video and audio", text: "Upload a video to create two independent outputs: a muted video file and an audio-only MP3 file." },
  { icon: <Gauge />, title: "Compress video", text: "Reduce video file size with Light, Balanced, or Maximum compression and export as MP4, MOV, MKV, or WebM." },
];

const documentFeatures = [
  { icon: <FileOutput />, title: "Convert documents", text: "Convert PDF, image, Word, Excel, PowerPoint, and DXF files to Word, Excel, PowerPoint, searchable PDF, or TXT." },
  { icon: <FileText />, title: "Preview documents", text: "Preview PDF and image files in the browser, adjust image zoom, and open the preview in full-screen mode." },
  { icon: <Scissors />, title: "Split PDF", text: "Select individual pages or page ranges, combine them into one PDF, or export separate groups as PDF or ZIP files." },
  { icon: <Layers3 />, title: "Merge PDF", text: "Add multiple PDF files, drag them into the required order, preview each file, and merge them into one document." },
];

export default function AboutPage({ editor }: { editor: "video" | "document" }) {
  const video = editor === "video";
  const features = video ? videoFeatures : documentFeatures;
  return <section className="about">
    <div className="about-hero">
      <span className="soft-icon">{video ? <Clapperboard /> : <FileText />}</span>
      <span className="eyebrow">LOCA EDITOR</span>
      <h2>About {video ? "Video Editor" : "Document Editor"}</h2>
      <p>{video
        ? "Video Editor brings video downloading, audio separation, and file compression together in one focused workspace."
        : "Document Editor provides document conversion, browser-based preview, and practical tools for splitting and merging PDF files."}</p>
    </div>
    <div className={`about-cards ${video ? "three" : "four"}`}>
      {features.map(feature => <article className="card" key={feature.title}>
        {feature.icon}<h3>{feature.title}</h3><p>{feature.text}</p>
      </article>)}
    </div>
  </section>;
}
