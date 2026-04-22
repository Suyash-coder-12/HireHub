import { useAuth } from '../context/AuthContext';

export default function JobCard({ job, onSave, onRemove, isSavedView }) {
  const { user } = useAuth();
  const companyInitial = job.company ? job.company.charAt(0).toUpperCase() : 'H';

  return (
    <div className="group relative bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.4)] transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col justify-between h-full">
      
      {/* Cyberpunk Scanline Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-[1.5s] ease-in-out opacity-0 group-hover:opacity-100 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-xl bg-black border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-black text-xl shadow-[0_0_15px_rgba(34,211,238,0.2)] group-hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] transition-all">
            {companyInitial}
          </div>
          <span className="text-[10px] uppercase tracking-widest font-mono text-cyan-300 bg-cyan-950/50 px-2.5 py-1 rounded border border-cyan-800/50">
            {job.salary || 'COMPETITIVE'}
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-white tracking-wide mb-1 group-hover:text-cyan-300 transition-colors">
          {job.title}
        </h3>
        <p className="text-slate-400 text-sm font-mono mb-5">
          {job.company} // {job.location}
        </p>

        {job.tags && (
          <div className="flex flex-wrap gap-2 mb-6">
            {job.tags.map(tag => (
              <span key={tag} className="text-xs font-mono text-fuchsia-300 bg-fuchsia-950/30 px-2 py-1 rounded border border-fuchsia-800/30">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 flex gap-3">
        <button className="flex-1 bg-transparent hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.1)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]">
          Initialize
        </button>
        
        {isSavedView ? (
          <button onClick={onRemove} className="px-4 py-2 text-red-400 hover:bg-red-500 hover:text-black border border-red-500/50 rounded-lg transition-all shadow-[0_0_10px_rgba(248,113,113,0.1)] hover:shadow-[0_0_20px_rgba(248,113,113,0.5)]">
            Drop
          </button>
        ) : (
          <button onClick={onSave} className="px-4 py-2 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-black border border-fuchsia-500/50 rounded-lg transition-all shadow-[0_0_10px_rgba(232,121,249,0.1)] hover:shadow-[0_0_20px_rgba(232,121,249,0.5)]">
            Save
          </button>
        )}
      </div>
    </div>
  );
}