/**
 * ============================================================================
 * HIREHUB ENTERPRISE CORE - BEATSVIBE TECHNOLOGIES
 * ============================================================================
 * This file contains the complete monolith architecture for the HireHub platform.
 * Features: Real-time Feed, Job Board fetching from RapidAPI, Live User Search,
 * Unique Usernames, Advanced Profile Management, and Legal/Privacy Policies.
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, googleProvider, githubProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, getDoc, getDocs, where, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// ==========================================
// 1. STATIC DATA & POLICIES (Enterprise Grade)
// ==========================================

const PRIVACY_POLICY = `
Privacy Policy for HireHub by BeatsVibe Technologies
Effective Date: April 2026

1. Information We Collect
We collect information you provide directly to us, such as your name, email address, professional experience, education, and portfolio links when you create an account or update your profile. We also automatically collect certain technical data when you use the platform.

2. How We Use Your Information
- To provide, maintain, and improve our services.
- To match you with relevant job opportunities.
- To enable real-time networking and communication with other professionals.
- To monitor and analyze trends, usage, and activities in connection with our platform.

3. Information Sharing
Your profile information is public to other registered members of HireHub to facilitate networking. We do not sell your personal data to third-party advertisers. Job applications are sent directly to the employer's portal.

4. Data Security
We use industry-standard security measures (including Firebase Authentication and encrypted Firestore databases) to protect your personal information.

5. Your Rights
You have the right to access, update, or delete your profile data at any time through the "Edit Profile" section.
`;

const TERMS_OF_SERVICE = `
Terms of Service - HireHub
By accessing or using HireHub, you agree to be bound by these Terms.

1. Professional Conduct: You agree to use the platform for professional networking and career advancement. Spam, harassment, and inappropriate content will result in immediate account termination.
2. Unique Usernames: Usernames are provided on a first-come, first-served basis. We reserve the right to reclaim inactive or trademark-infringing usernames.
3. Content Ownership: You retain ownership of the content you post. By posting, you grant HireHub a license to display and distribute that content within the platform.
`;

export default function Home() {
  // ==========================================
  // 2. STATE MANAGEMENT (The Brain of the App)
  // ==========================================
  
  // Auth & User States
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Navigation & View States
  const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'jobs', 'profile', 'privacy', 'terms'
  
  // Feed & Networking States
  const [posts, setPosts] = useState([]);
  const [liveMembers, setLiveMembers] = useState([]);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [newPostText, setNewPostText] = useState('');
  
  // Jobs States
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  
  // Modals & UI States
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [jobSearchResults, setJobSearchResults] = useState([]);

  // Profile Edit Form State
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', username: '', headline: '', about: '', experience: '', education: '', resumeLink: ''
  });

  // ==========================================
  // 3. LIFECYCLE EFFECTS (Fetching & Listening)
  // ==========================================

  // A. Authenticate User & Load Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const profileData = userSnap.data();
          setUserProfile(profileData);
          setEditForm(profileData);
        } else {
          // Initialize New User with Unique-ish Username
          const nameArray = currentUser.displayName?.split(' ') || ['', ''];
          const defaultUsername = (nameArray[0] + Math.floor(Math.random() * 10000)).toLowerCase();
          
          const newProfile = {
            firstName: nameArray[0], lastName: nameArray[nameArray.length-1] || '',
            username: defaultUsername,
            displayName: currentUser.displayName, email: currentUser.email, photoURL: currentUser.photoURL,
            headline: 'New Member | Ready to Connect',
            about: '', experience: '', education: '', resumeLink: '',
            searchTerms: [nameArray[0].toLowerCase(), (currentUser.displayName || '').toLowerCase(), defaultUsername],
            joinedAt: serverTimestamp()
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
          setEditForm(newProfile);
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // B. Real-time Listeners (Posts & Network)
  useEffect(() => {
    if (!user) return;
    
    // Listen to Global Feed
    const qPosts = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to Live Members (for right sidebar)
    const qUsers = query(collection(db, "users"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveMembers(usersData.filter(u => u.id !== user.uid).slice(0, 8)); // Top 8 recent
    });

    return () => { unsubPosts(); unsubUsers(); };
  }, [user]);

  // C. Fetch Live Jobs from RapidAPI
  useEffect(() => {
    if (jobs.length === 0) {
      setIsLoadingJobs(true);
      fetch('https://jsearch.p.rapidapi.com/search?query=software%20engineer%20in%20india&page=1&num_pages=2', {
        headers: { 'x-rapidapi-key': import.meta.env.VITE_RAPIDAPI_KEY, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' }
      }).then(res => res.json()).then(data => { if(data.data) setJobs(data.data); setIsLoadingJobs(false); }).catch(() => setIsLoadingJobs(false));
    }
  }, []);

  // ==========================================
  // 4. BUSINESS LOGIC & ACTIONS
  // ==========================================

  // Unique Username & Profile Update
  const handleSaveProfile = async () => {
    const requestedUsername = editForm.username.toLowerCase().replace(/[^a-z0-9_]/g, ''); // alphanumeric and underscore only
    if (requestedUsername.length < 3) return alert("Username must be at least 3 characters long and contain no spaces.");

    // Uniqueness Check
    const q = query(collection(db, "users"), where("username", "==", requestedUsername));
    const querySnapshot = await getDocs(q);
    const isTaken = querySnapshot.docs.some(doc => doc.id !== user.uid);
    
    if (isTaken) return alert(`🚨 Error: @${requestedUsername} is already taken. Please choose another.`);

    const userRef = doc(db, "users", user.uid);
    const updatedName = `${editForm.firstName} ${editForm.lastName}`;
    const profileToUpdate = { 
      ...editForm, 
      username: requestedUsername,
      displayName: updatedName, 
      searchTerms: [editForm.firstName.toLowerCase(), editForm.lastName.toLowerCase(), updatedName.toLowerCase(), requestedUsername] 
    };
    
    await setDoc(userRef, profileToUpdate, { merge: true });
    setUserProfile(profileToUpdate);
    setIsEditProfileOpen(false);
    alert("Profile Updated Successfully! ✅");
  };

  // Create Post
  const handleCreatePost = async () => {
    if (!newPostText.trim()) return;
    try {
      await addDoc(collection(db, "posts"), {
        content: newPostText, 
        author: userProfile?.displayName, username: userProfile?.username, authorId: user.uid, avatar: userProfile?.photoURL, role: userProfile?.headline, 
        createdAt: serverTimestamp(), likedBy: [], comments: [] 
      });
      setIsCreatePostOpen(false); setNewPostText('');
    } catch (e) { console.error("Post creation failed", e); }
  };

  // Interactions (Like & Comment)
  const handleLike = async (postId, currentLikes) => {
    const postRef = doc(db, "posts", postId);
    const hasLiked = currentLikes?.includes(user.uid);
    try {
      if (hasLiked) await updateDoc(postRef, { likedBy: arrayRemove(user.uid) });
      else await updateDoc(postRef, { likedBy: arrayUnion(user.uid) });
    } catch (e) { console.error("Like failed", e); }
  };

  const submitComment = async (postId) => {
    if(!commentText.trim()) return;
    const postRef = doc(db, "posts", postId);
    const newComment = { text: commentText, author: userProfile?.displayName, avatar: userProfile?.photoURL, id: Date.now().toString() };
    try {
      await updateDoc(postRef, { comments: arrayUnion(newComment) });
      setCommentText('');
    } catch (e) { alert("Error posting comment"); }
  };

  // Universal Search
  const handleSearch = async (e) => {
    const qStr = e.target.value.toLowerCase().trim();
    setSearchQuery(qStr);
    if (qStr.length > 1) {
      const q = query(collection(db, "users"), where("searchTerms", "array-contains", qStr));
      const snap = await getDocs(q);
      setUserSearchResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u => u.id !== user?.uid));
      setJobSearchResults(jobs.filter(j => j.job_title?.toLowerCase().includes(qStr) || j.employer_name?.toLowerCase().includes(qStr)).slice(0, 3));
    } else { clearSearchResults(); }
  };
  
  const clearSearchResults = () => { setUserSearchResults([]); setJobSearchResults([]); };
  const fullClearSearch = () => { setSearchQuery(''); clearSearchResults(); };

  // ==========================================
  // 5. RENDER HELPERS
  // ==========================================

  // Standard Footer Component
  const AppFooter = () => (
    <footer className="w-full bg-white border-t border-gray-200 mt-16 py-10">
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8 text-sm">
        <div>
           <h3 className="text-lg font-black text-blue-600 mb-4">HireHub</h3>
           <p className="text-gray-500 mb-4">The next-generation professional network built for modern engineers and designers.</p>
           <p className="text-xs font-bold text-gray-400">© 2026 BeatsVibe Technologies</p>
        </div>
        <div>
           <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">Navigation</h4>
           <ul className="space-y-2 text-gray-600 font-medium">
             <li className="hover:text-blue-600 cursor-pointer" onClick={() => setActiveTab('feed')}>Home Feed</li>
             <li className="hover:text-blue-600 cursor-pointer" onClick={() => setActiveTab('jobs')}>Job Board</li>
             <li className="hover:text-blue-600 cursor-pointer" onClick={() => setActiveTab('profile')}>My Profile</li>
           </ul>
        </div>
        <div>
           <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">Legal</h4>
           <ul className="space-y-2 text-gray-600 font-medium">
             <li className="hover:text-blue-600 cursor-pointer" onClick={() => setActiveTab('privacy')}>Privacy Policy</li>
             <li className="hover:text-blue-600 cursor-pointer" onClick={() => setActiveTab('terms')}>Terms of Service</li>
             <li className="hover:text-blue-600 cursor-pointer">Cookie Policy</li>
           </ul>
        </div>
        <div>
           <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">Contact</h4>
           <p className="text-gray-600 font-medium">support@beatsvibe.com</p>
           <p className="text-gray-600 font-medium mt-2">Nagpur, Maharashtra, India</p>
        </div>
      </div>
    </footer>
  );

  // ==========================================
  // 6. MAIN UI RENDERING
  // ==========================================

  // Loading / Auth Screen
  if (isAuthLoading) return <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-blue-700 rounded-full animate-spin"></div></div>;

  if (!user) return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-12 rounded-[2rem] shadow-2xl max-w-md w-full text-center border border-gray-100">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-600/30 mb-8">
           <span className="text-white text-4xl font-black">H.</span>
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">HireHub</h1>
        <p className="text-gray-500 mb-10 font-medium">Connect. Build. Elevate.</p>
        <button onClick={async () => {try { await signInWithPopup(auth, googleProvider); } catch(e){}}} className="w-full flex items-center justify-center gap-3 bg-[#1d1d1f] text-white font-bold py-4 px-4 rounded-full hover:scale-105 transition-transform shadow-xl">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" /> 
          Sign in with Google
        </button>
      </motion.div>
      <p className="mt-8 text-xs text-gray-400 font-bold uppercase tracking-widest">Powered by BeatsVibe</p>
    </div>
  );

  // Core App Container
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans flex flex-col overflow-x-hidden" onClick={() => { setOpenMenuId(null); clearSearchResults(); }}> 
      
      {/* ---------------- NAVBAR ---------------- */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-2xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black tracking-tight cursor-pointer text-blue-700 hover:text-blue-800 transition-colors" onClick={() => { setActiveTab('feed'); setSelectedJob(null); }}>HireHub</h1>
            
            {/* Global Search */}
            <div className="relative group" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center bg-gray-100/80 rounded-full px-5 h-11 w-64 md:w-96 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-4 ring-blue-50 border border-transparent transition-all">
                <span className="text-gray-400 mr-3">🔍</span>
                <input type="text" value={searchQuery} onChange={handleSearch} placeholder="Search @username or jobs..." className="bg-transparent border-none outline-none w-full text-sm font-bold text-gray-700 placeholder:font-medium" />
                {searchQuery && <button onClick={fullClearSearch} className="text-gray-400 hover:text-gray-700">&times;</button>}
              </div>
              
              {/* Search Dropdown */}
              <AnimatePresence>
                {(userSearchResults.length > 0 || jobSearchResults.length > 0) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-14 left-0 w-full bg-white border border-gray-200 shadow-2xl rounded-[1.5rem] p-3 z-[100] max-h-96 overflow-y-auto custom-scrollbar">
                    {userSearchResults.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">Members</p>
                        {userSearchResults.map(res => (
                          <div key={res.id} onClick={() => { setActiveTab('profile'); setUserProfile(res); fullClearSearch(); }} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl cursor-pointer transition-colors">
                            <img src={res.photoURL} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                            <div>
                              <p className="text-sm font-bold text-gray-900 leading-tight flex items-center gap-1">{res.displayName} <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">@{res.username}</span></p>
                              <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-1">{res.headline}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {jobSearchResults.length > 0 && (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">Opportunities</p>
                        {jobSearchResults.map(job => (
                          <div key={job.job_id} onClick={() => { setActiveTab('jobs'); setSelectedJob(job); fullClearSearch(); }} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl cursor-pointer transition-colors">
                            <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center font-bold text-gray-400 text-xl overflow-hidden p-1 shadow-inner">
                               {job.employer_logo ? <img src={job.employer_logo} className="w-full h-full object-contain" /> : job.employer_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-1">{job.job_title}</p>
                              <p className="text-xs text-blue-600 font-bold mt-1">{job.employer_name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1.5 rounded-full border border-gray-200/50">
                <button onClick={() => {setActiveTab('feed'); setSelectedJob(null);}} className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'feed' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>Feed</button>
                <button onClick={() => {setActiveTab('jobs'); setSelectedJob(null);}} className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'jobs' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>Jobs</button>
            </div>
            <button onClick={() => setIsCreatePostOpen(true)} className="hidden sm:flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full font-bold shadow-lg transition-transform hover:scale-105">+</button>
            <div className="relative group">
              <img src={userProfile?.photoURL || user.photoURL} className="w-11 h-11 rounded-full border-2 border-transparent hover:border-blue-300 cursor-pointer object-cover shadow-sm transition-all" alt="Profile" onClick={() => { setActiveTab('profile'); setUserProfile(userProfile); setSelectedJob(null); }} />
              <div className="absolute right-0 top-14 bg-white border border-gray-200 shadow-2xl rounded-2xl w-48 p-2 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50">
                 <button onClick={() => {setActiveTab('profile'); setUserProfile(userProfile);}} className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl">View Profile</button>
                 <div className="h-px bg-gray-100 my-1"></div>
                 <button onClick={() => signOut(auth)} className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl">Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        <AnimatePresence mode="wait">
          
          {/* ================= TAB 1: FEED ARCHITECTURE ================= */}
          {activeTab === 'feed' && (
            <motion.div key="feed" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid md:grid-cols-12 gap-8">
              
              {/* Feed Left Sidebar */}
              <aside className="hidden md:block md:col-span-3">
                <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden sticky top-24 hover:shadow-md transition-shadow">
                  <div className="h-24 bg-gradient-to-br from-blue-700 to-indigo-900"></div>
                  <div className="px-6 pb-6 relative -mt-12 text-center">
                    <img src={userProfile?.photoURL || user.photoURL} className="w-24 h-24 mx-auto rounded-full border-4 border-white object-cover shadow-md bg-white cursor-pointer hover:scale-105 transition-transform" onClick={() => setActiveTab('profile')} />
                    <h3 className="mt-4 font-black text-gray-900 text-xl hover:text-blue-600 cursor-pointer transition-colors" onClick={() => setActiveTab('profile')}>{userProfile?.displayName || user.displayName}</h3>
                    <p className="text-xs text-blue-600 font-black mb-2 uppercase tracking-widest">@{userProfile?.username}</p>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{userProfile?.headline}</p>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setActiveTab('profile')}>
                     <span className="text-xs font-black text-gray-500 uppercase tracking-widest">My Items</span>
                     <span className="text-gray-400">🔖</span>
                  </div>
                </div>
              </aside>

              {/* Center Feed Pipeline */}
              <div className="col-span-12 md:col-span-6 space-y-6">
                
                {/* Create Post Trigger */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm flex gap-4 items-center cursor-pointer hover:shadow-md transition-shadow group" onClick={() => setIsCreatePostOpen(true)}>
                  <img src={userProfile?.photoURL || user.photoURL} className="w-14 h-14 rounded-full object-cover shadow-inner" />
                  <div className="flex-1 bg-gray-50 rounded-full px-6 py-4 text-sm font-bold text-gray-400 border border-gray-200 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
                    Start a post to your network...
                  </div>
                </div>

                {/* Feed Posts Loop */}
                <div className="space-y-8">
                  {posts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-300">
                      <span className="text-5xl mb-4 block">📭</span>
                      <p className="text-gray-500 font-bold text-lg">Your feed is empty.</p>
                      <p className="text-gray-400 text-sm mt-1">Share something to get started!</p>
                    </div>
                  ) : posts.map((post) => {
                    const hasLiked = post.likedBy?.includes(user.uid);
                    return (
                    <div key={post.id} className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm p-8 hover:shadow-xl transition-shadow duration-300">
                      
                      {/* Post Header */}
                      <div className="flex justify-between items-start mb-6 relative">
                        <div className="flex gap-4 items-center">
                          <img src={post.avatar || 'https://via.placeholder.com/48'} className="w-14 h-14 rounded-full object-cover border border-gray-100 shadow-sm" />
                          <div>
                            <h4 className="font-black text-gray-900 text-lg hover:text-blue-600 cursor-pointer">{post.author}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                               <p className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">@{post.username || 'user'}</p>
                               <span className="text-gray-300">•</span>
                               <p className="text-[11px] text-gray-400 font-bold">{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Just now'}</p>
                            </div>
                            <p className="text-sm text-gray-500 font-medium mt-1 line-clamp-1">{post.role}</p>
                          </div>
                        </div>
                        
                        {/* 3 Dots Context Menu */}
                        <div className="relative">
                           <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === post.id ? null : post.id); }} className="text-gray-400 hover:bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center font-black tracking-widest transition-colors">...</button>
                           <AnimatePresence>
                            {openMenuId === post.id && (
                              <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute right-0 top-12 w-56 bg-white border border-gray-200 shadow-2xl rounded-2xl p-2 z-50">
                                 <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link Copied"); setOpenMenuId(null); }} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3">🔗 Copy link to post</button>
                                 {post.authorId === user.uid ? (
                                   <button onClick={async () => { if(window.confirm('Delete post?')) { await deleteDoc(doc(db, "posts", post.id)); setOpenMenuId(null); } }} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3 border-t border-gray-100 mt-1">🗑️ Delete post</button>
                                 ) : (
                                   <button onClick={() => { alert("Post reported."); setOpenMenuId(null); }} className="w-full text-left px-4 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50 rounded-xl transition-colors flex items-center gap-3 border-t border-gray-100 mt-1">🚩 Report post</button>
                                 )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      
                      {/* Post Body */}
                      <p className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                      
                      {/* Social Stats */}
                      <div className="mt-6 flex gap-4 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-4">
                         {post.likedBy?.length > 0 && <span className="flex items-center gap-1">❤️ {post.likedBy.length}</span>}
                         {post.comments?.length > 0 && <span className="flex items-center gap-1">💬 {post.comments.length}</span>}
                      </div>

                      {/* Interaction Bar */}
                      <div className="mt-2 pt-2 flex justify-between text-gray-500">
                         <button onClick={() => handleLike(post.id, post.likedBy)} className={`flex-1 flex items-center justify-center gap-3 text-sm font-bold hover:bg-gray-50 py-3 rounded-xl transition-all ${hasLiked ? 'text-red-500 bg-red-50' : ''}`}>
                            {hasLiked ? '❤️ Liked' : '🤍 Like'}
                         </button>
                         <button onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)} className="flex-1 flex items-center justify-center gap-3 text-sm font-bold hover:bg-gray-50 py-3 rounded-xl transition-all">
                            💬 Comment
                         </button>
                         <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link Copied!"); }} className="flex-1 flex items-center justify-center gap-3 text-sm font-bold hover:bg-gray-50 py-3 rounded-xl transition-all">
                            ↗️ Share
                         </button>
                      </div>

                      {/* Comment Thread */}
                      <AnimatePresence>
                        {activeCommentPost === post.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-4 pt-6 border-t border-gray-100 space-y-5">
                              {post.comments?.map((c, i) => (
                                <div key={i} className="flex gap-3 items-start">
                                  <img src={c.avatar} className="w-10 h-10 rounded-full border border-gray-200 object-cover shadow-sm mt-1" />
                                  <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none border border-gray-200 w-full hover:bg-gray-100 transition-colors">
                                    <h5 className="text-sm font-black text-gray-900">{c.author}</h5>
                                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">{c.text}</p>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Comment Input */}
                              <div className="flex gap-3 items-center mt-6">
                                 <img src={userProfile?.photoURL || user.photoURL} className="w-10 h-10 rounded-full border border-gray-200 object-cover shadow-sm" />
                                 <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-full pr-2 pl-5 h-12 focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-400 transition-all">
                                    <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => {if(e.key === 'Enter') submitComment(post.id)}} placeholder="Write your comment..." className="w-full bg-transparent outline-none text-sm font-medium" />
                                    <button onClick={() => submitComment(post.id)} className="bg-blue-600 text-white font-bold px-5 py-1.5 rounded-full text-xs shadow-md hover:bg-blue-700 transition-colors">Post</button>
                                 </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  )})}
                </div>
              </div>

              {/* Feed Right Sidebar: Live Network */}
              <aside className="hidden md:block md:col-span-3">
                <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-6 sticky top-24 hover:shadow-md transition-shadow">
                  <h3 className="font-black text-gray-900 mb-6 flex items-center justify-between text-lg">
                    Live Network <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                  </h3>
                  <ul className="space-y-5">
                    {liveMembers.map(member => (
                      <li key={member.id} className="flex items-center gap-4 cursor-pointer group" onClick={() => { setActiveTab('profile'); setUserProfile(member); }}>
                        <div className="relative">
                           <img src={member.photoURL} className="w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover:border-blue-400 transition-colors shadow-sm" />
                           <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 group-hover:text-blue-600 leading-tight transition-colors">{member.displayName}</p>
                          <p className="text-[10px] text-gray-500 font-bold mt-1 line-clamp-1">{member.headline}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </motion.div>
          )}

          {/* ================= TAB 2: JOBS BOARD ================= */}
          {activeTab === 'jobs' && !selectedJob && (
             <motion.div key="jobs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-6xl mx-auto">
               <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm p-8 mb-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl rounded-[2.5rem]"></div>
                  <h2 className="text-3xl font-black text-gray-900 relative z-10">Premium Opportunities</h2>
                  <p className="text-gray-500 font-medium mt-2 relative z-10">Handpicked roles for the HireHub community.</p>
               </div>

               {isLoadingJobs ? <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div></div> : (
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map((job) => (
                      <div key={job.job_id} onClick={() => setSelectedJob(job)} className="bg-white p-8 rounded-[2rem] border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col group h-full">
                         <div className="w-20 h-20 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center text-gray-400 font-black text-4xl overflow-hidden mb-6 p-2 group-hover:scale-105 transition-transform">
                           {job.employer_logo ? <img src={job.employer_logo} className="w-full h-full object-contain" /> : job.employer_name?.charAt(0)}
                         </div>
                         <h3 className="font-black text-xl text-gray-900 group-hover:text-blue-600 leading-tight mb-2">{job.job_title}</h3>
                         <p className="text-sm text-gray-600 font-bold">{job.employer_name}</p>
                         
                         <div className="mt-auto pt-6">
                            <span className="bg-blue-50 text-blue-700 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg inline-block">{job.job_city || 'Remote Location'}</span>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
             </motion.div>
          )}

          {/* JOB DETAILS MODAL/VIEW */}
          {selectedJob && (
             <motion.div key="job-detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl overflow-hidden mb-10">
              <div className="h-48 bg-gradient-to-r from-slate-900 to-black relative">
                 <button onClick={() => setSelectedJob(null)} className="absolute top-6 left-6 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2">← Back to Board</button>
              </div>
              <div className="px-12 pb-12 relative">
                <div className="w-32 h-32 bg-white rounded-[2rem] border-4 border-white shadow-xl flex items-center justify-center -mt-16 mb-8 p-4 overflow-hidden relative z-10">
                  {selectedJob.employer_logo ? <img src={selectedJob.employer_logo} className="w-full h-full object-contain" /> : <span className="text-6xl font-black text-gray-300">{selectedJob.employer_name?.charAt(0)}</span>}
                </div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">{selectedJob.job_title}</h1>
                <p className="text-xl text-blue-600 font-black mt-2">{selectedJob.employer_name} <span className="text-gray-400 font-medium ml-2">• {selectedJob.job_city || 'Remote Everywhere'}</span></p>
                
                <div className="mt-10 pt-10 border-t border-gray-100">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">About the Role</h3>
                  <div className="text-gray-700 text-base leading-loose whitespace-pre-wrap bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 shadow-inner">
                    {selectedJob.job_description || "Detailed description is available on the employer's portal."}
                  </div>
                </div>
                <div className="mt-10 flex gap-4">
                  <button onClick={() => window.open(selectedJob.job_apply_link, '_blank')} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-full font-black shadow-xl shadow-blue-600/30 transition-transform hover:-translate-y-1">Apply Externally ↗</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= TAB 3: ADVANCED PROFILE ================= */}
          {activeTab === 'profile' && userProfile && (
             <motion.div key="profile" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto mb-10">
                {/* Profile Header Banner */}
                <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden mb-8">
                  <div className="h-64 bg-gradient-to-br from-indigo-600 to-blue-800 relative">
                     <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>
                  </div>
                  <div className="px-12 pb-12 relative -mt-24">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                       <div className="relative inline-block">
                         <img src={userProfile.photoURL || user.photoURL} className="w-48 h-48 rounded-[2.5rem] border-8 border-white shadow-2xl object-cover bg-white" />
                         <span className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full"></span>
                       </div>
                       {userProfile.email === user.email && (
                          <button onClick={() => setIsEditProfileOpen(true)} className="bg-white border border-gray-200 text-gray-900 px-8 py-3 rounded-full font-black shadow-lg hover:bg-gray-50 transition-all mb-4">Edit Profile</button>
                       )}
                    </div>
                    
                    <div className="mt-8">
                       <h1 className="text-5xl font-black text-gray-900 tracking-tight">{userProfile.displayName}</h1>
                       <p className="text-xl text-blue-600 font-black mt-2 bg-blue-50 inline-block px-4 py-1 rounded-lg">@{userProfile.username}</p>
                       <p className="text-2xl text-gray-600 font-bold mt-4 max-w-2xl leading-tight">{userProfile.headline}</p>
                       <p className="text-sm text-gray-500 font-bold mt-4 uppercase tracking-widest flex items-center gap-2"><span>📍 Digital Nomad</span> <span>•</span> <span>✉️ {userProfile.email}</span></p>
                    </div>
                  </div>
                </div>

                {/* Profile Sections */}
                <div className="grid lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-8">
                     <div className="bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-sm">
                         <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-3"><span className="text-2xl">📖</span> About</h3>
                         <p className="text-gray-700 text-base whitespace-pre-wrap leading-loose font-medium">{userProfile.about || 'A passionate professional looking to connect.'}</p>
                     </div>
                     <div className="bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-sm">
                         <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-3"><span className="text-2xl">💼</span> Experience</h3>
                         <p className="text-gray-700 text-base whitespace-pre-wrap leading-loose font-medium">{userProfile.experience || 'Ready for new challenges.'}</p>
                     </div>
                  </div>
                  
                  <div className="lg:col-span-4 space-y-8">
                     <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
                         <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-3"><span className="text-2xl">🎓</span> Education</h3>
                         <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed font-medium">{userProfile.education || 'Lifelong learner.'}</p>
                     </div>
                     
                     {userProfile.resumeLink && (
                       <div className="bg-gradient-to-br from-gray-900 to-black text-white p-10 rounded-[2.5rem] shadow-2xl text-center relative overflow-hidden group">
                         <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                         <h3 className="text-xl font-black mb-2 relative z-10">Professional Resume</h3>
                         <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8 relative z-10">Verified Document</p>
                         <a href={userProfile.resumeLink} target="_blank" rel="noreferrer" className="block w-full bg-white text-black py-4 rounded-full font-black hover:scale-105 transition-transform shadow-lg relative z-10">View Portfolio</a>
                       </div>
                     )}
                  </div>
                </div>
             </motion.div>
          )}

          {/* ================= TAB 4 & 5: PRIVACY POLICY AND TERMS ================= */}
          {(activeTab === 'privacy' || activeTab === 'terms') && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto bg-white p-12 rounded-[2.5rem] border border-gray-200 shadow-sm mb-10">
              <h1 className="text-4xl font-black text-gray-900 mb-8 border-b border-gray-100 pb-8">{activeTab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h1>
              <div className="prose max-w-none text-gray-700 leading-loose whitespace-pre-wrap font-medium">
                {activeTab === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ---------------- FOOTER INCLUDED ---------------- */}
      {user && <AppFooter />}

      {/* ================= GLOBAL MODALS ================= */}
      <AnimatePresence>
        
        {/* MODAL 1: CREATE POST */}
        {isCreatePostOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsCreatePostOpen(false)}></div>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-8 border border-white/20">
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-6">
                 <h2 className="text-2xl font-black text-gray-900">Create a post</h2>
                 <button onClick={() => setIsCreatePostOpen(false)} className="bg-gray-100 hover:bg-gray-200 w-10 h-10 rounded-full flex items-center justify-center text-gray-600 font-bold transition-colors">&times;</button>
              </div>
              <div className="flex gap-4 mb-6 items-center">
                <img src={userProfile?.photoURL || user.photoURL} className="w-14 h-14 rounded-full object-cover shadow-sm border border-gray-100" />
                <div>
                  <h4 className="font-black text-gray-900 text-lg">{userProfile?.displayName || user.displayName}</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Posting to Network</p>
                </div>
              </div>
              <textarea value={newPostText} onChange={(e) => setNewPostText(e.target.value)} placeholder="What do you want to talk about, Founder?" className="w-full h-40 resize-none outline-none text-xl font-medium text-gray-800 placeholder:text-gray-300" autoFocus></textarea>
              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button onClick={handleCreatePost} className={`px-10 py-4 rounded-full font-black shadow-lg transition-all ${newPostText.trim() ? 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Publish Post</button>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* MODAL 2: EDIT PROFILE (The Unique Username Engine) */}
        {isEditProfileOpen && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsEditProfileOpen(false)}></div>
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl bg-white rounded-[2.5rem] p-10 max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar">
               <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100">
                  <h2 className="text-3xl font-black text-gray-900">Edit Profile Details</h2>
                  <button onClick={() => setIsEditProfileOpen(false)} className="bg-gray-100 hover:bg-gray-200 w-10 h-10 rounded-full flex items-center justify-center text-gray-600 font-bold transition-colors">&times;</button>
               </div>
               
               <div className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">First Name</label>
                     <input type="text" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="w-full border-2 border-gray-100 p-4 bg-gray-50 hover:bg-white rounded-[1.5rem] outline-none focus:border-blue-500 focus:bg-white font-bold transition-all" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Last Name</label>
                     <input type="text" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="w-full border-2 border-gray-100 p-4 bg-gray-50 hover:bg-white rounded-[1.5rem] outline-none focus:border-blue-500 focus:bg-white font-bold transition-all" />
                   </div>
                 </div>
                 
                 <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                   <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 px-2">Unique Username</label>
                   <div className="flex items-center bg-white border-2 border-blue-200 rounded-[1.5rem] overflow-hidden focus-within:border-blue-600 focus-within:ring-4 ring-blue-50 transition-all">
                      <span className="pl-5 font-black text-blue-400 text-lg">@</span>
                      <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full p-4 bg-transparent outline-none font-black text-blue-700" placeholder="your_unique_id" />
                   </div>
                   <p className="text-[10px] text-gray-500 font-bold mt-2 px-2 uppercase tracking-widest">Only lowercase letters and numbers.</p>
                 </div>

                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Professional Headline</label>
                   <input type="text" value={editForm.headline} onChange={e => setEditForm({...editForm, headline: e.target.value})} className="w-full border-2 border-gray-100 p-4 bg-gray-50 hover:bg-white rounded-[1.5rem] outline-none focus:border-blue-500 focus:bg-white font-bold transition-all" />
                 </div>
                 
                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">About Section</label>
                   <textarea value={editForm.about} onChange={e => setEditForm({...editForm, about: e.target.value})} className="w-full border-2 border-gray-100 p-4 bg-gray-50 hover:bg-white rounded-[1.5rem] h-32 resize-none outline-none focus:border-blue-500 focus:bg-white font-bold transition-all custom-scrollbar"></textarea>
                 </div>
                 
                 <div className="grid md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Experience</label>
                     <textarea value={editForm.experience} onChange={e => setEditForm({...editForm, experience: e.target.value})} className="w-full border-2 border-gray-100 p-4 bg-gray-50 hover:bg-white rounded-[1.5rem] h-32 resize-none outline-none focus:border-blue-500 focus:bg-white font-bold transition-all custom-scrollbar"></textarea>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Education</label>
                     <textarea value={editForm.education} onChange={e => setEditForm({...editForm, education: e.target.value})} className="w-full border-2 border-gray-100 p-4 bg-gray-50 hover:bg-white rounded-[1.5rem] h-32 resize-none outline-none focus:border-blue-500 focus:bg-white font-bold transition-all custom-scrollbar"></textarea>
                   </div>
                 </div>

                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Portfolio / Resume Link</label>
                   <input type="url" value={editForm.resumeLink} onChange={e => setEditForm({...editForm, resumeLink: e.target.value})} className="w-full border-2 border-gray-100 p-4 bg-gray-50 hover:bg-white rounded-[1.5rem] outline-none focus:border-blue-500 focus:bg-white font-bold transition-all" placeholder="https://" />
                 </div>
               </div>
               
               <div className="flex gap-4 mt-10 pt-8 border-t border-gray-100">
                 <button onClick={() => setIsEditProfileOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-full font-black transition-colors">Cancel</button>
                 <button onClick={handleSaveProfile} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-full font-black shadow-xl shadow-blue-600/20 hover:-translate-y-1 transition-all">Save Profile Data</button>
               </div>
             </motion.div>
           </div>
         )}
      </AnimatePresence>

    </div>
  );
}