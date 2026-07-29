import { FolderOpen } from "lucide-react";
type Props={file:File|null;accept:string;hint:string;onChange:(file:File|null)=>void};
export default function FileDrop({file,accept,hint,onChange}:Props){return <label className="dropzone"><input type="file" accept={accept} onChange={event=>onChange(event.target.files?.[0]||null)}/><span className="drop-icon"><FolderOpen/></span><strong>{file?.name||"Drag and drop or click to choose a file"}</strong><small>{file?`${(file.size/1048576).toFixed(1)} MB`:hint}</small></label>;}
