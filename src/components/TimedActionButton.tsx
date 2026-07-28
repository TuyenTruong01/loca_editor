import type { MouseEventHandler, ReactNode } from "react";
import { Clock3 } from "lucide-react";

type Props = {
  label: string;
  loadingLabel: string;
  isRunning: boolean;
  elapsedTime: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  icon?: ReactNode;
  className?: string;
  buttonType?: "button" | "submit" | "reset";
  error?: boolean;
  success?: boolean;
};

function spokenTime(value: string) {
  const parts = value.split(":").map(Number);
  if (parts.length === 3) return `${parts[0]} giờ ${parts[1]} phút ${parts[2]} giây`;
  return `${parts[0]} phút ${parts[1]} giây`;
}

export default function TimedActionButton({ label, loadingLabel, isRunning, elapsedTime, disabled, onClick, icon, className = "", buttonType = "button", error, success }: Props) {
  const status = error ? "error" : success ? "success" : isRunning ? "running" : "idle";
  return <div className={`timed-action-row ${className}`} data-status={status}>
    <button type={buttonType} className="primary timed-action-button" disabled={disabled || isRunning} onClick={onClick}>{icon}{isRunning ? loadingLabel : label}</button>
    <div className="timed-action-clock" aria-label={`Thời gian xử lý: ${spokenTime(elapsedTime)}`}><Clock3 aria-hidden="true" /><span>{elapsedTime}</span></div>
  </div>;
}
