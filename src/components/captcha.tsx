import { useRef, useEffect, useCallback } from 'react';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';

interface CaptchaProps {
  onCaptchaChange: (token: string) => void;
  height?: number;
  width?: number;
}

export function Captcha({ onCaptchaChange, height = 44, width = 120 }: CaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const randomColor = (min: number, max: number) => {
    const r = min + Math.floor(Math.random() * (max - min));
    const g = min + Math.floor(Math.random() * (max - min));
    const b = min + Math.floor(Math.random() * (max - min));
    return `rgb(${r},${g},${b})`;
  };

  const drawCaptcha = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = randomColor(230, 255);
    ctx.fillRect(0, 0, width, height);

    // Generate token
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let newToken = '';
    for (let i = 0; i < 6; i++) {
      newToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    onCaptchaChange(newToken);

    // Draw interference lines
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = randomColor(100, 200);
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Draw interference dots
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = randomColor(150, 200);
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw text
    for (let i = 0; i < newToken.length; i++) {
      const char = newToken[i];
      ctx.font = `bold ${Math.floor(Math.random() * 8 + 20)}px Arial`; // Random font size between 20-28
      ctx.fillStyle = randomColor(50, 150);
      
      const x = 10 + i * (width / 6.5);
      const y = height / 1.5 + Math.random() * 8 - 4; // Random Y position
      const angle = (Math.random() - 0.5) * (Math.PI / 4); // Random rotation
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, [width, height, onCaptchaChange]);

  useEffect(() => {
    drawCaptcha();
  }, [drawCaptcha]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative rounded-md overflow-hidden border border-border shrink-0 cursor-pointer" onClick={drawCaptcha} title="Nhấn để đổi mã">
        <canvas ref={canvasRef} width={width} height={height} className="block bg-white" />
      </div>
      <button
        type="button"
        onClick={drawCaptcha}
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        title="Tải lại mã xác nhận"
      >
        <ArrowsClockwiseIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
