import { useEffect, useState } from "react";
import { Clapperboard, Download, FileImage, FileOutput, FileText, Gauge, Layers3, PlayCircle, RotateCw, Scissors, VolumeX } from "lucide-react";

const videoFeatures = [
  { icon: <Download />, title: "Download video", text: "Download a video from a direct URL and choose between 720p, 1080p, or original quality." },
  { icon: <VolumeX />, title: "Separate video and audio", text: "Upload a video to create two independent outputs: a muted video file and an audio-only MP3 file." },
  { icon: <Gauge />, title: "Compress video", text: "Reduce video file size with Light, Balanced, or Maximum compression and export as MP4, MOV, MKV, or WebM." },
  { icon: <RotateCw />, title: "Rotate and mirror video", text: "Rotate a video left or right in 90-degree steps, mirror it horizontally, preview the orientation, and save an MP4 copy." },
];

const documentFeatures = [
  { icon: <FileOutput />, title: "Convert documents", text: "Convert PDF, PNG, JPG, TIFF, and BMP files to Word, Excel, PowerPoint, searchable PDF, or TXT." },
  { icon: <FileText />, title: "Preview documents", text: "Preview PDF and image files in the browser, adjust image zoom, and open the preview in full-screen mode." },
  { icon: <Scissors />, title: "Split PDF", text: "Select individual pages or page ranges, combine them into one PDF, or export separate groups as PDF or ZIP files." },
  { icon: <Layers3 />, title: "Merge PDF", text: "Add multiple PDF files, drag them into the required order, preview each file, and merge them into one document." },
  { icon: <RotateCw />, title: "Rotate PDF", text: "Rotate all pages or selected page ranges left, right, or 180 degrees and preview the processed PDF before saving." },
];

export default function AboutPage({ editor }: { editor: "video" | "document" }) {
  const video = editor === "video";
  const features = video ? videoFeatures : documentFeatures;
  const [mediaMissing, setMediaMissing] = useState(false);
  useEffect(() => setMediaMissing(false), [editor]);
  const asset = `${import.meta.env.BASE_URL}assets/${video ? "video-editor-demo.mp4" : "document-editor-demo.png"}`;
  return <section className="about">
    <div className="about-hero">
      <span className="soft-icon">{video ? <Clapperboard /> : <FileText />}</span>
      <span className="eyebrow">LOCA EDITOR</span>
      <h2>About {video ? "Video Editor" : "Document Editor"}</h2>
      <p>{video
        ? "Video Editor brings video downloading, audio separation, and file compression together in one focused workspace."
        : "Document Editor provides document conversion, browser-based preview, and practical tools for splitting and merging PDF files."}</p>
    </div>
    <div className={`about-media ${video ? "video-demo" : "image-demo"}`}>
      <div className="about-media-heading"><div><span className="eyebrow">PRODUCT DEMO</span><h3>{video ? "See Video Editor in action" : "Explore the Document Editor workspace"}</h3></div><span>{video ? "Demo video" : "Interface preview"}</span></div>
      <div className="about-media-frame">
        {!mediaMissing && (video
          ? <video src={asset} controls preload="metadata" onError={() => setMediaMissing(true)}>Your browser does not support video playback.</video>
          : <img src={asset} alt="Loca Document Editor interface" onError={() => setMediaMissing(true)} />)}
        {mediaMissing && <div className="about-media-placeholder">{video ? <PlayCircle /> : <FileImage />}<strong>{video ? "Demo video coming soon" : "Interface image coming soon"}</strong><p>Add <code>{video ? "video-editor-demo.mp4" : "document-editor-demo.png"}</code> to <code>public/assets</code>.</p></div>}
      </div>
    </div>
    <div className="about-cards four">
      {features.map(feature => <article className="card" key={feature.title}>
        {feature.icon}<h3>{feature.title}</h3><p>{feature.text}</p>
      </article>)}
    </div>
  </section>;
}
