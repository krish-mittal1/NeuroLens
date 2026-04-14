import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../AppContext";

export default function SliceViewer({ sliceInfo }) {
  const [axis, setAxis] = useState("axial");
  const [sliceIndex, setSliceIndex] = useState(0);
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const maxSlice = sliceInfo ? (sliceInfo[axis] || 1) - 1 : 0;

  useEffect(() => {
    const mid = Math.floor(maxSlice / 2);
    setSliceIndex(mid);
  }, [axis, maxSlice]);

  useEffect(() => {
    if (!sliceInfo) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`${API_BASE}/api/slices/${axis}/${sliceIndex}`)
        .then((r) => {
          if (!r.ok) throw new Error("Slice fetch failed");
          return r.blob();
        })
        .then((blob) => {
          setImgSrc(URL.createObjectURL(blob));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 50);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [axis, sliceIndex, sliceInfo]);

  if (!sliceInfo) return null;

  return (
    <div className="slice-viewer">
      <div className="slice-header">
        <h3>2D Slice Viewer</h3>
        <div className="axis-tabs">
          {["axial", "coronal", "sagittal"].map((a) => (
            <button
              key={a}
              className={`axis-tab ${axis === a ? "active" : ""}`}
              onClick={() => setAxis(a)}
            >
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="slice-display">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`${axis} slice ${sliceIndex}`}
            className={`slice-image ${loading ? "loading" : ""}`}
          />
        ) : (
          <div className="slice-placeholder">Loading slice...</div>
        )}
      </div>
      <div className="slice-controls">
        <span className="slice-label">Slice</span>
        <input
          type="range"
          min={0}
          max={maxSlice}
          value={sliceIndex}
          onChange={(e) => setSliceIndex(Number(e.target.value))}
          className="slice-slider"
        />
        <span className="slice-index">{sliceIndex} / {maxSlice}</span>
      </div>
      <p className="slice-hint">
        {axis === "axial" && "Top-down view · Red overlay = detected tumor"}
        {axis === "coronal" && "Front-to-back view · Red overlay = detected tumor"}
        {axis === "sagittal" && "Side view · Red overlay = detected tumor"}
      </p>
    </div>
  );
}
