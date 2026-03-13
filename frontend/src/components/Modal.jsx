export default function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2937]/40 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-2xl rounded-2xl border border-[#eef0f4] bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#1f2937]">{title}</h3>
          <button onClick={onClose} className="btn-secondary px-2.5 py-1">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
