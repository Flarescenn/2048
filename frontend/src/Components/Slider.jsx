
import { useState, useRef, useEffect } from 'react';

export default function Slider({ label, value, min, max, step, onChange }) {
    const trackRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    // Calculate the fill percentage for the track and thumb position
    const percentage = ((value - min) / (max - min)) * 100;

    // This effect handles the mouse dragging logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !trackRef.current) return;
            
            // Get the dimensions and position of the slider track
            const trackRect = trackRef.current.getBoundingClientRect();
            
            // Calculate mouse position relative to the track, clamping it between 0 and track width
            const relativeX = Math.max(0, Math.min(e.clientX - trackRect.left, trackRect.width));
            
            // Convert the pixel position to a percentage
            const percent = relativeX / trackRect.width;
            
            // Convert the percentage to a raw value in our range
            let newValue = min + percent * (max - min);
            
            // Snap the value to the nearest step
            newValue = Math.round(newValue / step) * step;
            
            // Ensure the final value is within the min/max bounds
            newValue = Math.max(min, Math.min(newValue, max));
            
            onChange(newValue);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        // If we are dragging, listen for mouse movements and release anywhere on the page
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        // Cleanup: remove the global listeners when the component unmounts or dragging stops
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, min, max, step, onChange]);

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-300">{label}</label>
                <span className="font-mono text-base font-semibold text-purple-300">
                    {parseFloat(value).toFixed(2)}
                </span>
            </div>
            <div
                ref={trackRef}
                onMouseDown={() => setIsDragging(true)}
                className="relative w-full h-2 bg-slate-700 rounded-full cursor-pointer"
            >
                {/* The filled part of the track */}
                <div
                    className="absolute h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                />

                {/* The draggable thumb */}
                <div
                    className="absolute top-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-slate-900 transform -translate-y-1/2 -translate-x-1/2 transition-transform hover:scale-110"
                    style={{ left: `${percentage}%` }}
                />
            </div>
        </div>
    );
}