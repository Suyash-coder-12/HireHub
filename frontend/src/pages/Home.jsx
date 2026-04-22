import { useState } from 'react';

// --- MOCK DATABASE ---
const JOB_DATABASE = [
  {
    id: 1,
    title: 'Senior Software Engineer',
    company: 'TechCorp Solutions',
    location: 'Pune, Maharashtra (Hybrid)',
    salary: '₹18,00,000 - ₹24,00,000 / yr',
    type: 'Full-time',
    posted: '2 days ago',
    description: 'We are looking for a highly skilled Senior Software Engineer to lead our backend architecture team. You will be responsible for designing, developing, and maintaining highly scalable APIs and microservices.',
    requirements: ['5+ years of experience with Node.js and Python', 'Strong understanding of AWS infrastructure', 'Experience leading agile teams'],
    logoText: 'T'
  },
  {
    id: 2,
    title: 'Product Manager',
    company: 'InnovateX',
    location: 'Bangalore, Karnataka (On-site)',
    salary: '₹20,00,000 - ₹30,00,000 / yr',
    type: 'Full-time',
    posted: '5 hours ago',
    description: 'Join InnovateX as a Product Manager to drive the vision and execution of our flagship SaaS product. You will work closely with engineering, design, and marketing to deliver user-centric solutions.',
    requirements: ['3+ years in B2B SaaS Product Management', 'Excellent communication and wireframing skills', 'Data-driven decision making'],
    logoText: 'I'
  },
  {
    id: 3,
    title: 'UI/UX Designer',
    company: 'BeatsVibe Technologies',
    location: 'Nagpur, Maharashtra (Remote)',
    salary: '₹15,00,000 - ₹25,00,000 / yr',
    type: 'Full-time',
    posted: '1 day ago',
    description: 'We are looking for a creative UI/UX Designer to create beautiful and intuitive user experiences for our web and mobile applications.',
    requirements: ['3+ years of experience in UI/UX Design', 'Proficiency in Figma and Adobe Creative Suite', 'Strong portfolio demonstrating design skills'],
    logoText: 'D'
  },
  {
    id: 4,
    title: 'Data Scientist',
    company: 'NeuroSync Solutions',
    location: 'Delhi, Delhi (On-site)',
    salary: '₹25,00,000 - ₹35,00,000 / yr',
    type: 'Full-time',
    posted: '3 days ago',
    description: 'Join our data science team to drive insights and innovation through advanced analytics and machine learning.',
    requirements: ['Masters in Data Science or related field', 'Proficiency in Python and R', 'Experience with SQL and big data platforms'],
    logoText: 'D'
  },
  {
    id: 5,
    title: 'Marketing Intern',
    company: 'GreenLeaf Organics',
    location: 'Jaipur, Rajasthan (On-site)',
    salary: '₹10,00,000 - ₹15,00,000 / yr',
    type: 'Internship',
    posted: '1 day ago',
    description: 'Join our marketing team as an intern to gain hands-on experience in digital marketing and brand management.',
    requirements: ['Currently pursuing a degree in Marketing or related field', 'Strong communication skills', 'Familiarity with social media platforms'],
    logoText: 'G'
  },
  {
    id: 6,
    title: 'React Developer Intern',
    company: 'StartupX',
    location: 'Remote',
    salary: '₹8,00,000 - ₹12,00,000 / yr',
    type: 'Internship',
    posted: '5 hours ago',
    description: 'We are looking for a passionate React Developer Intern to join our team and work on exciting projects.',
    requirements: ['Currently pursuing a degree in Computer Science or related field', 'Basic understanding of React and JavaScript', 'Eagerness to learn and grow'],
    logoText: 'S'
  },
  {
    id: 7,
    title: 'Frontend Engineer',
    company: 'TechCorp',
    location: 'Remote',
    salary: 'Competitive',
    type: 'Full-time',
    posted: '2 days ago',
    description: 'We are seeking a skilled Frontend Engineer to join our team and help build cutting-edge web applications.',
    requirements: ['3+ years of experience with React and modern frontend technologies', 'Strong understanding of responsive design', 'Experience with RESTful APIs'],
    logoText: 'T'
  }

];

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedJob, setSelectedJob] = useState(null);
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [appliedJobs, setAppliedJobs] = useState(new Set());

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setActiveView('detail');
    window.scrollTo(0, 0);
  };

  const handleBackToDashboard = () => {
    setActiveView('dashboard');
    setSelectedJob(null);
  };

  const toggleSaveJob = (id, e) => {
    e.stopPropagation();
    const newSaved = new Set(savedJobs);
    if (newSaved.has(id)) {
      newSaved.delete(id);
    } else {
      newSaved.add(id);
    }
    setSavedJobs(newSaved);
  };

  const handleApply = (id) => {
    const newApplied = new Set(appliedJobs);
    newApplied.add(id);
    setAppliedJobs(newApplied);
    alert('Application submitted successfully!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* --- FORMAL NAVIGATION BAR --- */}
      <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* LOGO SECTION */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleBackToDashboard}>
            {/* IMAGE LOGO YAHAN DALO:
                Agar image 'public' folder mein hai toh src="/logo.png" likho.
                Agar 'src/assets' mein hai toh pehle import karo.
            */}
            <img 
              src="/image.png" 
              alt="HireHub Logo" 
              className="w-10 h-10 object-contain rounded" 
              onError={(e) => { e.target.src = 'https://via.placeholder.com/40?text=HH' }} // Fallback agar image na mile
            />
            <span className="text-xl font-bold tracking-tight text-slate-800">HireHub</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={handleBackToDashboard} className="hover:text-blue-700 transition-colors">Find Jobs</button>
            <button className="hover:text-blue-700 transition-colors">Companies</button>
            <button className="hover:text-blue-700 transition-colors flex items-center gap-1">
              Saved Jobs
              {savedJobs.size > 0 && (
                <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">{savedJobs.size}</span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium py-2 px-5 rounded transition-colors shadow-sm">Post a Job</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeView === 'dashboard' && (
          <div className="grid md:grid-cols-4 gap-6">
            <aside className="hidden md:block col-span-1">
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-3 border-b pb-2 text-sm">Job Filters</h3>
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                   <p className="p-2 bg-blue-50 text-blue-700 rounded cursor-pointer">All Opportunities</p>
                   <p className="p-2 hover:bg-slate-50 rounded cursor-pointer">Remote Work</p>
                   <p className="p-2 hover:bg-slate-50 rounded cursor-pointer">Internships</p>
                </div>
              </div>
            </aside>

            <div className="col-span-3 space-y-4">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Available Positions</h2>
              {JOB_DATABASE.map((job) => (
                <div 
                  key={job.id} 
                  onClick={() => handleViewJob(job)}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex gap-4"
                >
                  <div className="w-14 h-14 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg flex items-center justify-center font-bold text-xl flex-shrink-0">
                    {job.logoText}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">{job.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">{job.company}</p>
                      </div>
                      <button 
                        onClick={(e) => toggleSaveJob(job.id, e)}
                        className={`text-sm font-bold ${savedJobs.has(job.id) ? 'text-blue-700' : 'text-slate-400'}`}
                      >
                        {savedJobs.has(job.id) ? '★ Saved' : '☆ Save'}
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2 text-[11px] font-bold uppercase tracking-wider">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">{job.location}</span>
                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded">{job.salary}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'detail' && selectedJob && (
          <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100">
              <button onClick={handleBackToDashboard} className="text-blue-700 font-bold text-sm mb-6 block">← Back to Dashboard</button>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center font-bold text-3xl">{selectedJob.logoText}</div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{selectedJob.title}</h1>
                  <p className="text-lg text-slate-600">{selectedJob.company}</p>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => handleApply(selectedJob.id)}
                  className={`py-3 px-10 rounded-full font-bold text-sm transition-all ${appliedJobs.has(selectedJob.id) ? 'bg-green-600 text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'}`}
                >
                  {appliedJobs.has(selectedJob.id) ? 'Applied' : 'Apply Now'}
                </button>
                <button onClick={(e) => toggleSaveJob(selectedJob.id, e)} className="py-3 px-8 rounded-full font-bold text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all">
                  {savedJobs.has(selectedJob.id) ? 'Saved' : 'Save for Later'}
                </button>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <h3 className="font-bold text-lg mb-2">Job Description</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{selectedJob.description}</p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Requirements</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-600">
                  {selectedJob.requirements.map((req, i) => <li key={i}>{req}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}