import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import JobCard from '../components/JobCard';

export default function SavedDashboard() {
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!user && !loading) {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    if (user) fetchSavedJobs();
  }, [user]);

  const fetchSavedJobs = async () => {
    try {
      const token = await user.getIdToken();
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedJobs(res.data);
    } catch (error) {
      console.error("Error fetching saved jobs", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (jobId) => {
    try {
      const token = await user.getIdToken();
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/saved-jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedJobs(savedJobs.filter(job => job.jobId !== jobId));
    } catch (error) {
      alert("Error removing job");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Your Saved Jobs</h1>
        <p className="text-slate-500 mt-2">Manage and apply to your bookmarked opportunities.</p>
      </div>
      
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(n => <div key={n} className="h-64 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>)}
        </div>
      ) : savedJobs.length === 0 ? (
        
        /* Premium Empty State */
        <div className="text-center py-24 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 mx-auto rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No saved jobs yet</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            When you find a job you like, click the heart icon to save it here so you can apply later.
          </p>
          <Link to="/" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold hover:bg-slate-800 transition-colors">
            Browse Jobs
          </Link>
        </div>

      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {savedJobs.map(savedJob => (
             <JobCard 
               key={savedJob._id} 
               job={savedJob.jobData} 
               isSavedView={true}
               onRemove={() => handleRemove(savedJob.jobId)} 
             />
          ))}
        </div>
      )}
    </div>
  );
}