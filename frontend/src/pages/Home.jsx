/**
 * ============================================================================
 * HIREHUB ENTERPRISE CORE - BEATSVIBE TECHNOLOGIES (V6 - Custom Logo)
 * ============================================================================
 * Features: Cinematic Splash Screen (with Custom Image Logo), Firebase Upload, 
 * Universal Search, Custom Avatars, Live Networking, Fully Responsive UI.
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, getDoc, getDocs, where, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- MOCK DATA FALLBACKS ---
const SYSTEM_POSTS = [
  {
    id: 'sys-1', author: 'HireHub Official', username: 'hirehub', role: 'Platform Updates', avatar: '/logo.png',
    content: 'Welcome to HireHub! 🚀 We are thrilled to have you here. Start by setting up your profile, connecting with peers, and exploring the latest job opportunities.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    createdAt: { toDate: () => new Date() }, isSystem: true, likedBy: [], comments: []
  }
];

const FALLBACK_JOBS = [
  { job_id: 'fj-1', employer_name: 'Microsoft', employer_logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg', job_title: 'Senior Frontend Engineer', job_city: 'Bangalore', job_employment_type: 'Full-time', job_apply_link: '#', job_description: 'Join our team to build next-generation web applications.' },
  { job_id: 'fj-2', employer_name: 'BeatsVibe Tech', employer_logo: '/logo.png', job_title: 'Full Stack Developer', job_city: 'Remote', job_employment_type: 'Contract', job_apply_link: '#', job_description: 'Looking for a rockstar developer to scale the HireHub architecture.' }
];

export default function Home() {
  // --- STATE MANAGEMENT ---
  const [showSplash, setShowSplash] = useState(true); 
  
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('feed'); 
  const [posts, setPosts] = useState([]);
  const [liveMembers, setLiveMembers] = useState([]);
  
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  
  // Post Creation States
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false); 
  
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [jobSearchResults, setJobSearchResults] = useState([]);

  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', username: '', customAvatar: '', headline: '', about: '', 
    experience: '', education: '', resumeLink: '', skills: '', github: '', linkedin: ''
  });

  // --- LIFECYCLE EFFECTS ---
  useEffect(() => {
    // Hide Splash Screen after 3 seconds
    const splashTimer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const profileData = userSnap.data();
          setUserProfile(profileData);
          setEditForm({ ...profileData, customAvatar: profileData.photoURL, skills: profileData.skillsArray ? profileData.skillsArray.join(', ') : '' });
        } else {
          const nameArray = currentUser.displayName?.split(' ') || ['', ''];
          const defaultUsername = (nameArray[0] + Math.floor(Math.random() * 10000)).toLowerCase();
          const newProfile = {
            firstName: nameArray[0], lastName: nameArray[nameArray.length-1] || '', username: defaultUsername,
            displayName: currentUser.displayName, email: currentUser.email, photoURL: currentUser.photoURL,
            headline: 'New Member | Ready to Connect', about: '', experience: '', education: '', resumeLink: '', github: '', linkedin: '', skillsArray: [],
            searchTerms: [nameArray[0].toLowerCase(), (currentUser.displayName || '').toLowerCase(), defaultUsername], joinedAt: serverTimestamp()
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
          setEditForm({...newProfile, customAvatar: currentUser.photoURL, skills: ''});
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qPosts = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => { setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });

    const qUsers = query(collection(db, "users"), orderBy("joinedAt", "desc"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveMembers(usersData.filter(u => u.id !== user.uid).slice(0, 8)); 
    });

    return () => { unsubPosts(); unsubUsers(); };
  }, [user]);

  useEffect(() => {
    if (jobs.length === 0) {
      setIsLoadingJobs(true);
      fetch('https://jsearch.p.rapidapi.com/search?query=software%20engineer%20in%20india&page=1&num_pages=1', {
        headers: { 'x-rapidapi-key': import.meta.env.VITE_RAPIDAPI_KEY, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' }
      }).then(res => res.json()).then(data => { 
        if(data.data && data.data.length > 0) setJobs(data.data); 
        else setJobs(FALLBACK_JOBS); 
        setIsLoadingJobs(false); 
      }).catch(() => { setJobs(FALLBACK_JOBS); setIsLoadingJobs(false); });
    }
  }, []);

  // --- FIREBASE IMAGE UPLOAD ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploadingImage(true);
    const storage = getStorage(auth.app);
    const storageRef = ref(storage, `posts/${user.uid}_${Date.now()}_${file.name}`);
    
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setNewPostImage(downloadURL); 
    } catch (error) {
      console.error(error);
      alert("Image upload failed! Make sure Firebase Storage is enabled in your Firebase Console.");
    }
    setIsUploadingImage(false);
  };

  // --- ACTIONS ---
  const handleSaveProfile = async () => {
    const requestedUsername = editForm.username.toLowerCase().replace(/[^a-z0-9_]/g, ''); 
    if (requestedUsername.length < 3) return alert("Username must be at least 3 characters long (no spaces).");

    const q = query(collection(db, "users"), where("username", "==", requestedUsername));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.docs.some(doc => doc.id !== user.uid)) return alert(`🚨 Error: @${requestedUsername} is already taken!`);

    const parsedSkills = editForm.skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
    const updatedName = `${editForm.firstName} ${editForm.lastName}`;
    const newSearchTerms = [editForm.firstName.toLowerCase(), editForm.lastName.toLowerCase(), updatedName.toLowerCase(), requestedUsername, ...parsedSkills];

    const profileToUpdate = { 
      ...editForm, username: requestedUsername, displayName: updatedName, photoURL: editForm.customAvatar || user.photoURL, 
      skillsArray: parsedSkills, searchTerms: newSearchTerms 
    };
    
    await setDoc(doc(db, "users", user.uid), profileToUpdate, { merge: true });
    setUserProfile(profileToUpdate); setIsEditProfileOpen(false);
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim() && !newPostImage) return; 
    try {
      await addDoc(collection(db, "posts"), {
        content: newPostText, image: newPostImage, 
        author: userProfile?.displayName || user.displayName, username: userProfile?.username || 'user', 
        authorId: user.uid, avatar: userProfile?.photoURL || user.photoURL || '', 
        role: userProfile?.headline || 'Member', 
        createdAt: serverTimestamp(), likedBy: [], comments: [] 
      });
      setIsCreatePostOpen(false); setNewPostText(''); setNewPostImage('');
    } catch (e) { console.error("Post creation failed", e); }
  };

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
    const newComment = { 
      text: commentText, 
      author: userProfile?.displayName || user.displayName || 'Member', 
      avatar: userProfile?.photoURL || user.photoURL || '', 
      id: Date.now().toString() 
    };
    try { await updateDoc(postRef, { comments: arrayUnion(newComment) }); setCommentText(''); } 
    catch (e) { alert("Error posting comment: " + e.message); }
  };

  const handleSearch = async (e) => {
    const qStr = e.target.value.toLowerCase().trim();
    setSearchQuery(qStr);
    if (qStr.length > 1) {
      const q = query(collection(db, "users"), where("searchTerms", "array-contains", qStr));
      const snap = await getDocs(q);
      setUserSearchResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u => u.id !== user?.uid));
      setJobSearchResults(jobs.filter(j => j.job_title?.toLowerCase().includes(qStr) || j.employer_name?.toLowerCase().includes(qStr)).slice(0, 3));
    } else { setUserSearchResults([]); setJobSearchResults([]); }
  };
  
  const fullClearSearch = () => { setSearchQuery(''); setUserSearchResults([]); setJobSearchResults([]); };
  const displayFeedPosts = posts.length > 0 ? posts : SYSTEM_POSTS; 

  // ==========================================
  // UI RENDERING
  // ==========================================

  // --- 1. THE CINEMATIC SPLASH SCREEN (Custom Image Logo) ---
  if (showSplash) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[200] bg-[#1d1d1f] flex flex-col items-center justify-center overflow-hidden"
        >
          <motion.img 
            src="image.png" 
            alt="HireHub Logo"
            initial={{ scale: 0.5, rotate: -15, opacity: 0 }} 
            animate={{ scale: 1, rotate: 0, opacity: 1 }} 
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
            className="w-28 h-28 md:w-32 md:h-32 rounded-3xl object-contain shadow-[0_0_80px_rgba(37,99,235,0.5)] mb-8 bg-blue-600 p-2"
          />
          <motion.h1 
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
            className="text-5xl md:text-7xl font-black text-white tracking-tighter"
          >
            Hire<span className="text-blue-500">Hub</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}
            className="text-gray-400 font-bold uppercase tracking-widest mt-6 text-sm"
          >
            By BeatsVibe Technologies
          </motion.p>
          <motion.div 
             initial={{ width: 0 }} animate={{ width: "200px" }} transition={{ delay: 1.5, duration: 1 }}
             className="h-1 bg-blue-600 mt-10 rounded-full"
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // --- 2. LOGIN SCREEN (Custom Image Logo) ---
  if (isAuthLoading) return <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-blue-700 rounded-full animate-spin"></div></div>;

  if (!user) return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl max-w-md w-full text-center border border-gray-100">
        <img 
            src="image.png" 
            alt="HireHub Logo" 
            className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-3xl object-contain shadow-lg shadow-blue-600/30 mb-6 md:mb-8 bg-blue-600 p-2" 
        />
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">HireHub</h1>
        <p className="text-gray-500 mb-8 md:mb-10 font-medium">Connect. Build. Elevate.</p>
        <button onClick={async () => {try { await signInWithPopup(auth, googleProvider); } catch(e){}}} className="w-full flex items-center justify-center gap-3 bg-[#1d1d1f] text-white font-bold py-3 md:py-4 px-4 rounded-full hover:scale-105 transition-transform shadow-xl">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4 md:w-5 md:h-5 bg-white rounded-full p-0.5" alt="Google" /> Sign in with Google
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans flex flex-col overflow-x-hidden" onClick={() => { setOpenMenuId(null); fullClearSearch(); }}> 
      
      {/* ---------------- NAVBAR (Custom Image Logo) ---------------- */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-2xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setActiveTab('feed'); setSelectedJob(null); }}>
              <img src="image.png" alt="HireHub" className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-contain bg-blue-600 p-1 shadow-sm group-hover:scale-105 transition-transform" />
              <span className="hidden sm:inline text-xl md:text-2xl font-black tracking-tight text-blue-700 group-hover:text-blue-800 transition-colors">HireHub</span>
            </div>
            
            <div className="relative group" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center bg-gray-100/80 rounded-full px-3 md:px-5 h-9 md:h-11 w-40 sm:w-64 md:w-96 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-4 ring-blue-50 border border-transparent transition-all">
                <span className="text-gray-400 mr-2 md:mr-3 text-sm">🔍</span>
                <input type="text" value={searchQuery} onChange={handleSearch} placeholder="Search name, @user, or skill..." className="bg-transparent border-none outline-none w-full text-xs md:text-sm font-bold text-gray-700" />
              </div>
              <AnimatePresence>
                {(userSearchResults.length > 0 || jobSearchResults.length > 0) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-12 left-0 w-64 md:w-full bg-white border border-gray-200 shadow-2xl rounded-[1.5rem] p-3 z-[100] max-h-80 overflow-y-auto custom-scrollbar">
                    {userSearchResults.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Members</p>
                        {userSearchResults.map(res => (
                          <div key={res.id} onClick={() => { setActiveTab('profile'); setUserProfile(res); fullClearSearch(); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer">
                            <img src={res.photoURL} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                              <p className="text-xs md:text-sm font-bold text-gray-900 leading-tight">@{res.username}</p>
                              <p className="text-[10px] text-gray-500 font-medium mt-1 line-clamp-1">{res.headline}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {jobSearchResults.length > 0 && (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Jobs</p>
                        {jobSearchResults.map(job => (
                          <div key={job.job_id} onClick={() => { setActiveTab('jobs'); setSelectedJob(job); fullClearSearch(); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer">
                            <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center font-bold text-gray-400 text-lg overflow-hidden shrink-0 shadow-inner">
                               {job.employer_logo ? <img src={job.employer_logo} className="w-full h-full object-contain p-1" /> : job.employer_name?.charAt(0)}
                            </div>
                            <div><p className="text-xs md:text-sm font-bold text-gray-900 leading-tight line-clamp-1">{job.job_title}</p></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1.5 rounded-full border border-gray-200/50">
                <button onClick={() => {setActiveTab('feed'); setSelectedJob(null);}} className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'feed' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>Feed</button>
                <button onClick={() => {setActiveTab('jobs'); setSelectedJob(null);}} className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'jobs' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>Jobs</button>
            </div>
            <div className="md:hidden flex items-center gap-2">
                <button onClick={() => {setActiveTab('feed'); setSelectedJob(null);}} className={`text-xl ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-400'}`}>🏠</button>
                <button onClick={() => {setActiveTab('jobs'); setSelectedJob(null);}} className={`text-xl ${activeTab === 'jobs' ? 'text-blue-600' : 'text-gray-400'}`}>💼</button>
            </div>
            <button onClick={() => setIsCreatePostOpen(true)} className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 md:w-10 md:h-10 rounded-full font-bold shadow-lg transition-transform hover:scale-105">+</button>
            <div className="relative group">
              <img src={userProfile?.photoURL || user.photoURL} className="w-8 h-8 md:w-11 md:h-11 rounded-full border-2 border-transparent hover:border-blue-300 cursor-pointer object-cover shadow-sm transition-all" alt="Profile" onClick={() => { setActiveTab('profile'); setUserProfile(userProfile); setSelectedJob(null); }} />
              <div className="absolute right-0 top-10 md:top-14 bg-white border border-gray-200 shadow-2xl rounded-2xl w-48 p-2 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50">
                 <button onClick={() => {setActiveTab('profile'); setUserProfile(userProfile);}} className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl">View Profile</button>
                 <button onClick={() => signOut(auth)} className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl border-t mt-1">Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 flex-1 w-full">
        <AnimatePresence mode="wait">
          
          {/* ================= TAB 1: FEED ================= */}
          {activeTab === 'feed' && (
            <motion.div key="feed" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
              
              <aside className="hidden lg:block lg:col-span-3">
                <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden sticky top-24 hover:shadow-md transition-shadow">
                  <div className="h-24 bg-gradient-to-br from-blue-700 to-indigo-900"></div>
                  <div className="px-6 pb-6 relative -mt-12 text-center">
                    <img src={userProfile?.photoURL || user.photoURL} className="w-24 h-24 mx-auto rounded-full border-4 border-white object-cover shadow-md bg-white cursor-pointer hover:scale-105 transition-transform" onClick={() => setActiveTab('profile')} />
                    <h3 className="mt-4 font-black text-gray-900 text-xl hover:text-blue-600 cursor-pointer transition-colors" onClick={() => setActiveTab('profile')}>{userProfile?.displayName || user.displayName}</h3>
                    <p className="text-xs text-blue-600 font-black mb-2 uppercase tracking-widest">@{userProfile?.username}</p>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{userProfile?.headline}</p>
                  </div>
                </div>
              </aside>

              <div className="col-span-1 lg:col-span-6 space-y-4 md:space-y-6">
                
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-200 shadow-sm flex gap-3 md:gap-4 items-center cursor-pointer hover:shadow-md transition-shadow group" onClick={() => setIsCreatePostOpen(true)}>
                  <img src={userProfile?.photoURL || user.photoURL} className="w-10 h-10 md:w-14 md:h-14 rounded-full object-cover shadow-inner shrink-0" />
                  <div className="flex-1 bg-gray-50 rounded-full px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-gray-400 border border-gray-200 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                    <span>Share a post or image...</span>
                    <span className="text-xl">📸</span>
                  </div>
                </div>

                <div className="space-y-4 md:space-y-8">
                  {displayFeedPosts.map((post) => {
                    const hasLiked = post.likedBy?.includes(user.uid);
                    return (
                    <div key={post.id} className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm p-5 md:p-8 hover:shadow-lg transition-shadow duration-300">
                      
                      <div className="flex justify-between items-start mb-4 md:mb-6 relative">
                        <div className="flex gap-3 md:gap-4 items-center">
                          <img src={post.avatar || 'https://via.placeholder.com/48'} className="w-10 h-10 md:w-14 md:h-14 rounded-full object-cover border border-gray-100 shadow-sm shrink-0" />
                          <div>
                            <h4 className="font-black text-gray-900 text-base md:text-lg hover:text-blue-600 cursor-pointer">{post.author}</h4>
                            <div className="flex items-center gap-1 md:gap-2 mt-0.5 flex-wrap">
                               <p className="text-[9px] md:text-[11px] bg-blue-50 text-blue-700 px-1.5 md:px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">@{post.username || 'user'}</p>
                               <span className="text-gray-300 hidden sm:inline">•</span>
                               <p className="text-[9px] md:text-[11px] text-gray-400 font-bold w-full sm:w-auto">{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Just now'}</p>
                            </div>
                            <p className="text-xs md:text-sm text-gray-500 font-medium mt-1 line-clamp-1">{post.role}</p>
                          </div>
                        </div>
                        
                        <div className="relative shrink-0">
                           <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === post.id ? null : post.id); }} className="text-gray-400 hover:bg-gray-100 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black tracking-widest transition-colors">...</button>
                           <AnimatePresence>
                            {openMenuId === post.id && (
                              <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute right-0 top-10 md:top-12 w-48 bg-white border border-gray-200 shadow-2xl rounded-xl p-2 z-50">
                                 {post.authorId === user.uid && !post.isSystem && (
                                   <button onClick={async () => { if(window.confirm('Delete post?')) { await deleteDoc(doc(db, "posts", post.id)); setOpenMenuId(null); } }} className="w-full text-left px-3 py-2 text-xs md:text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">🗑️ Delete post</button>
                                 )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      
                      <p className="text-sm md:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                      
                      {post.image && (
                         <div className="mt-4 md:mt-6 rounded-xl md:rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 max-h-[500px] flex items-center justify-center">
                            <img src={post.image} alt="Post Attachment" className="w-full h-full object-cover object-center max-h-[500px]" onError={(e) => e.target.style.display = 'none'} />
                         </div>
                      )}

                      <div className="mt-4 md:mt-6 flex gap-3 md:gap-4 text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 md:pb-4">
                         {post.likedBy?.length > 0 && <span className="flex items-center gap-1">❤️ {post.likedBy.length}</span>}
                         {post.comments?.length > 0 && <span className="flex items-center gap-1">💬 {post.comments.length}</span>}
                      </div>

                      <div className="mt-2 pt-2 flex justify-between text-gray-500">
                         <button onClick={() => handleLike(post.id, post.likedBy)} className={`flex-1 flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm font-bold hover:bg-gray-50 py-2 md:py-3 rounded-lg md:rounded-xl transition-all ${hasLiked ? 'text-red-500 bg-red-50' : ''}`}>
                            {hasLiked ? '❤️ Liked' : '🤍 Like'}
                         </button>
                         <button onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)} className="flex-1 flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm font-bold hover:bg-gray-50 py-2 md:py-3 rounded-lg md:rounded-xl transition-all">
                            💬 Comment
                         </button>
                      </div>

                      <AnimatePresence>
                        {activeCommentPost === post.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-3 md:mt-4 pt-4 md:pt-6 border-t border-gray-100 space-y-4">
                              {post.comments?.map((c, i) => (
                                <div key={i} className="flex gap-2 md:gap-3 items-start">
                                  <img src={c.avatar} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-200 object-cover shadow-sm mt-1 shrink-0" />
                                  <div className="bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-200 w-full">
                                    <h5 className="text-xs md:text-sm font-black text-gray-900">{c.author}</h5>
                                    <p className="text-xs md:text-sm text-gray-700 mt-1 leading-relaxed">{c.text}</p>
                                  </div>
                                </div>
                              ))}
                              
                              <div className="flex gap-2 md:gap-3 items-center mt-4">
                                 <img src={userProfile?.photoURL || user.photoURL} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-200 object-cover shadow-sm shrink-0" />
                                 <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-full pr-1.5 pl-3 h-10 md:h-12">
                                    <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => {if(e.key === 'Enter') submitComment(post.id)}} placeholder="Write a comment..." className="w-full bg-transparent outline-none text-xs md:text-sm font-medium" />
                                    <button onClick={() => submitComment(post.id)} className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-full text-[10px] hover:bg-blue-700 transition-colors">Post</button>
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

              <aside className="hidden lg:block lg:col-span-3">
                <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-6 sticky top-24 hover:shadow-md transition-shadow">
                  <h3 className="font-black text-gray-900 mb-6 flex items-center justify-between text-lg">
                    Live Network <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                  </h3>
                  <ul className="space-y-5">
                    {liveMembers.map(member => (
                      <li key={member.id} className="flex items-center gap-3 cursor-pointer group" onClick={() => { setActiveTab('profile'); setUserProfile(member); }}>
                        <div className="relative shrink-0">
                           <img src={member.photoURL} className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-blue-400 transition-colors shadow-sm" />
                           <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 group-hover:text-blue-600 leading-tight transition-colors line-clamp-1">{member.displayName}</p>
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
               <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm p-6 md:p-8 mb-6 md:mb-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl rounded-2xl md:rounded-[2.5rem]"></div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 relative z-10">Premium Opportunities</h2>
                  <p className="text-xs md:text-sm text-gray-500 font-medium mt-2 relative z-10">Handpicked roles for the HireHub community.</p>
               </div>

               {isLoadingJobs ? <div className="flex justify-center py-20"><div className="w-8 md:w-10 h-8 md:h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div></div> : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {jobs.map((job) => (
                      <div key={job.job_id} onClick={() => setSelectedJob(job)} className="bg-white p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col group h-full">
                         <div className="w-16 h-16 md:w-20 md:h-20 bg-white border border-gray-100 shadow-sm rounded-xl md:rounded-2xl flex items-center justify-center text-gray-400 font-black text-2xl md:text-4xl overflow-hidden mb-4 md:mb-6 p-2 group-hover:scale-105 transition-transform shrink-0">
                           {job.employer_logo ? <img src={job.employer_logo} className="w-full h-full object-contain" /> : job.employer_name?.charAt(0)}
                         </div>
                         <h3 className="font-black text-lg md:text-xl text-gray-900 group-hover:text-blue-600 leading-tight mb-2 line-clamp-2">{job.job_title}</h3>
                         <p className="text-xs md:text-sm text-gray-600 font-bold">{job.employer_name}</p>
                         
                         <div className="mt-auto pt-4 md:pt-6">
                            <span className="bg-blue-50 text-blue-700 px-3 md:px-4 py-1.5 md:py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg inline-block">{job.job_city || 'Remote Location'}</span>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
             </motion.div>
          )}

          {/* JOB DETAILS MODAL/VIEW */}
          {selectedJob && (
             <motion.div key="job-detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden mb-8 md:mb-10">
              <div className="h-32 md:h-48 bg-gradient-to-r from-slate-900 to-black relative">
                 <button onClick={() => setSelectedJob(null)} className="absolute top-4 md:top-6 left-4 md:left-6 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all flex items-center gap-2">← Back</button>
              </div>
              <div className="px-6 pb-8 md:px-12 md:pb-12 relative">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-xl md:rounded-[2rem] border-4 border-white shadow-xl flex items-center justify-center -mt-12 md:-mt-16 mb-6 md:mb-8 p-3 md:p-4 overflow-hidden relative z-10 shrink-0">
                  {selectedJob.employer_logo ? <img src={selectedJob.employer_logo} className="w-full h-full object-contain" /> : <span className="text-4xl md:text-6xl font-black text-gray-300">{selectedJob.employer_name?.charAt(0)}</span>}
                </div>
                <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">{selectedJob.job_title}</h1>
                <p className="text-lg md:text-xl text-blue-600 font-black mt-2">{selectedJob.employer_name} <span className="text-gray-400 font-medium ml-1 md:ml-2 text-sm md:text-base block sm:inline">• {selectedJob.job_city || 'Remote Everywhere'}</span></p>
                
                <div className="mt-8 md:mt-10 pt-8 md:pt-10 border-t border-gray-100">
                  <h3 className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-widest mb-4 md:mb-6">About the Role</h3>
                  <div className="text-gray-700 text-sm md:text-base leading-relaxed md:leading-loose whitespace-pre-wrap bg-gray-50/50 p-5 md:p-8 rounded-xl md:rounded-[2rem] border border-gray-100 shadow-inner">
                    {selectedJob.job_description || "Detailed description is available on the employer's portal."}
                  </div>
                </div>
                <div className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-4">
                  <button onClick={() => window.open(selectedJob.job_apply_link, '_blank')} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-12 py-4 md:py-5 rounded-full font-black shadow-xl shadow-blue-600/30 transition-transform hover:-translate-y-1 text-sm md:text-base">Apply Externally ↗</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= TAB 3: ADVANCED PROFILE ================= */}
          {activeTab === 'profile' && userProfile && (
             <motion.div key="profile" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto mb-8 md:mb-10">
                <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden mb-6 md:mb-8">
                  <div className="h-40 md:h-64 bg-gradient-to-br from-indigo-600 to-blue-800 relative">
                     <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>
                  </div>
                  <div className="px-6 pb-8 md:px-12 md:pb-12 relative -mt-16 md:-mt-24 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 md:gap-6">
                       <div className="relative inline-block mx-auto sm:mx-0">
                         <img src={userProfile.photoURL || user.photoURL} className="w-32 h-32 md:w-48 md:h-48 rounded-full md:rounded-[2.5rem] border-4 md:border-8 border-white shadow-xl md:shadow-2xl object-cover bg-white" />
                         <span className="absolute bottom-1 md:bottom-2 right-1 md:right-2 w-6 h-6 md:w-8 md:h-8 bg-green-500 border-2 md:border-4 border-white rounded-full"></span>
                       </div>
                       {userProfile.email === user.email && (
                          <button onClick={() => setIsEditProfileOpen(true)} className="bg-white border border-gray-200 text-gray-900 px-6 md:px-8 py-2 md:py-3 rounded-full font-black shadow-md hover:bg-gray-50 transition-all w-full sm:w-auto text-sm md:text-base">Edit Profile</button>
                       )}
                    </div>
                    
                    <div className="mt-6 md:mt-8">
                       <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">{userProfile.displayName}</h1>
                       <p className="text-lg md:text-xl text-blue-600 font-black mt-1 md:mt-2 bg-blue-50 inline-block px-3 py-0.5 md:px-4 md:py-1 rounded-lg">@{userProfile.username}</p>
                       <p className="text-base md:text-2xl text-gray-600 font-bold mt-3 md:mt-4 max-w-2xl leading-tight mx-auto sm:mx-0">{userProfile.headline}</p>
                       <p className="text-xs md:text-sm text-gray-500 font-bold mt-3 md:mt-4 uppercase tracking-widest flex flex-wrap justify-center sm:justify-start items-center gap-2"><span>📍 Digital Nomad</span> <span>•</span> <span>✉️ {userProfile.email}</span></p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                  <div className="lg:col-span-8 space-y-6 md:space-y-8">
                     <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm">
                         <h3 className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2 md:gap-3"><span className="text-xl md:text-2xl">📖</span> About</h3>
                         <p className="text-gray-700 text-sm md:text-base whitespace-pre-wrap leading-relaxed md:leading-loose font-medium">{userProfile.about || 'A passionate professional looking to connect.'}</p>
                     </div>
                     <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm">
                         <h3 className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2 md:gap-3"><span className="text-xl md:text-2xl">💼</span> Experience</h3>
                         <p className="text-gray-700 text-sm md:text-base whitespace-pre-wrap leading-relaxed md:leading-loose font-medium">{userProfile.experience || 'Ready for new challenges.'}</p>
                     </div>
                  </div>
                  
                  <div className="lg:col-span-4 space-y-6 md:space-y-8">
                     {userProfile.skillsArray && userProfile.skillsArray.length > 0 && (
                       <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm">
                           <h3 className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2 md:gap-3"><span className="text-xl md:text-2xl">⚡</span> Top Skills</h3>
                           <div className="flex flex-wrap gap-2">
                              {userProfile.skillsArray.map((skill, idx) => (
                                 <span key={idx} className="bg-gray-100 text-gray-700 font-bold px-3 py-1.5 rounded-lg text-xs capitalize">{skill}</span>
                              ))}
                           </div>
                       </div>
                     )}

                     <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-200 shadow-sm">
                         <h3 className="text-xs md:text-sm font-black text-gray-900 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2 md:gap-3"><span className="text-xl md:text-2xl">🎓</span> Education</h3>
                         <p className="text-gray-700 text-xs md:text-sm whitespace-pre-wrap leading-relaxed font-medium">{userProfile.education || 'Lifelong learner.'}</p>
                     </div>

                     <div className="space-y-4">
                       {userProfile.github && (
                         <a href={userProfile.github} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-[#24292e] text-white p-4 md:p-5 rounded-2xl shadow-md hover:scale-105 transition-transform">
                           <span className="font-bold text-sm">GitHub Profile</span><span className="text-xl">↗</span>
                         </a>
                       )}
                       {userProfile.linkedin && (
                         <a href={userProfile.linkedin} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-[#0077b5] text-white p-4 md:p-5 rounded-2xl shadow-md hover:scale-105 transition-transform">
                           <span className="font-bold text-sm">LinkedIn Profile</span><span className="text-xl">↗</span>
                         </a>
                       )}
                       {userProfile.resumeLink && (
                         <div className="bg-gradient-to-br from-gray-900 to-black text-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-xl text-center relative overflow-hidden group mt-4">
                           <h3 className="text-lg md:text-xl font-black mb-2 relative z-10">Professional Resume</h3>
                           <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mb-6 relative z-10">Verified Document</p>
                           <a href={userProfile.resumeLink} target="_blank" rel="noreferrer" className="block w-full bg-white text-black py-3 md:py-4 rounded-full font-black hover:scale-105 transition-transform shadow-lg relative z-10 text-sm md:text-base">View Portfolio</a>
                         </div>
                       )}
                     </div>
                  </div>
                </div>
             </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ================= GLOBAL MODALS ================= */}
      <AnimatePresence>
        
        {/* MODAL 1: CREATE POST WITH REAL IMAGE UPLOAD */}
        {isCreatePostOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsCreatePostOpen(false)}></div>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-2xl md:rounded-[2.5rem] shadow-2xl p-6 md:p-8 border border-white/20 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-gray-100 pb-4 md:pb-6 shrink-0">
                 <h2 className="text-lg md:text-2xl font-black text-gray-900">Create a post</h2>
                 <button onClick={() => setIsCreatePostOpen(false)} className="bg-gray-100 hover:bg-gray-200 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-gray-600 font-bold transition-colors">&times;</button>
              </div>
              <div className="flex gap-3 md:gap-4 mb-4 md:mb-6 items-center shrink-0">
                <img src={userProfile?.photoURL || user.photoURL} className="w-10 h-10 md:w-14 md:h-14 rounded-full object-cover shadow-sm border border-gray-100" />
                <div>
                  <h4 className="font-black text-gray-900 text-base md:text-lg">{userProfile?.displayName || user.displayName}</h4>
                  <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5 md:mt-1">Posting to Network</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                 <textarea value={newPostText} onChange={(e) => setNewPostText(e.target.value)} placeholder="What do you want to talk about, Founder?" className="w-full min-h-[120px] md:min-h-[160px] resize-none outline-none text-base md:text-xl font-medium text-gray-800 placeholder:text-gray-300" autoFocus></textarea>
                 
                 {/* FIREBASE REAL IMAGE UPLOAD */}
                 <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <div className="flex items-center gap-4">
                       <input type="file" id="imageUpload" className="hidden" accept="image/*" onChange={handleImageUpload} />
                       <label htmlFor="imageUpload" className="cursor-pointer bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors flex items-center gap-2">
                          {isUploadingImage ? '⏳ Uploading to Cloud...' : '📸 Upload Photo'}
                       </label>
                       {newPostImage && <span className="text-xs font-bold text-green-600">✅ Image Ready</span>}
                    </div>
                    {newPostImage && (
                       <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 max-h-48 relative">
                          <img src={newPostImage} alt="Preview" className="w-full h-full object-cover" />
                       </div>
                    )}
                 </div>
              </div>

              <div className="pt-4 md:pt-6 border-t border-gray-100 flex justify-end shrink-0 mt-4">
                <button disabled={isUploadingImage} onClick={handleCreatePost} className={`w-full sm:w-auto px-6 md:px-10 py-3 md:py-4 rounded-full font-black shadow-lg transition-all text-sm md:text-base ${((newPostText.trim() || newPostImage) && !isUploadingImage) ? 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Publish Post</button>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* MODAL 2: EDIT PROFILE */}
        {isEditProfileOpen && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsEditProfileOpen(false)}></div>
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl bg-white rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar flex flex-col">
               <div className="flex justify-between items-center mb-6 md:mb-8 pb-4 md:pb-6 border-b border-gray-100 shrink-0">
                  <h2 className="text-xl md:text-3xl font-black text-gray-900">Edit Profile Details</h2>
                  <button onClick={() => setIsEditProfileOpen(false)} className="bg-gray-100 hover:bg-gray-200 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-gray-600 font-bold transition-colors">&times;</button>
               </div>
               
               <div className="space-y-4 md:space-y-6 flex-1">
                 <div className="flex flex-col sm:flex-row items-center gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <img src={editForm.customAvatar || user.photoURL} className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-md object-cover shrink-0" />
                    <div className="flex-1 w-full">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Profile Picture URL</label>
                       <input type="url" value={editForm.customAvatar} onChange={e => setEditForm({...editForm, customAvatar: e.target.value})} placeholder="Paste image link here..." className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-sm" />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                   <div>
                     <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 px-1 md:px-2">First Name</label>
                     <input type="text" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="w-full border-2 border-gray-100 p-3 md:p-4 bg-gray-50 hover:bg-white rounded-xl md:rounded-[1.5rem] outline-none focus:border-blue-500 focus:bg-white font-bold transition-all text-sm md:text-base" />
                   </div>
                   <div>
                     <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 px-1 md:px-2">Last Name</label>
                     <input type="text" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="w-full border-2 border-gray-100 p-3 md:p-4 bg-gray-50 hover:bg-white rounded-xl md:rounded-[1.5rem] outline-none focus:border-blue-500 focus:bg-white font-bold transition-all text-sm md:text-base" />
                   </div>
                 </div>
                 
                 <div className="bg-blue-50/50 p-4 md:p-6 rounded-xl md:rounded-[2rem] border border-blue-100">
                   <label className="block text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 md:mb-2 px-1 md:px-2">Unique Username</label>
                   <div className="flex items-center bg-white border-2 border-blue-200 rounded-xl md:rounded-[1.5rem] overflow-hidden focus-within:border-blue-600 focus-within:ring-2 md:focus-within:ring-4 ring-blue-50 transition-all">
                      <span className="pl-4 md:pl-5 font-black text-blue-400 text-base md:text-lg">@</span>
                      <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full p-3 md:p-4 bg-transparent outline-none font-black text-blue-700 text-sm md:text-base" placeholder="your_unique_id" />
                   </div>
                 </div>

                 <div>
                   <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 px-1 md:px-2">Top Skills (Comma Separated)</label>
                   <input type="text" value={editForm.skills} onChange={e => setEditForm({...editForm, skills: e.target.value})} placeholder="e.g. React, Python, UI/UX" className="w-full border-2 border-gray-100 p-3 md:p-4 bg-gray-50 hover:bg-white rounded-xl md:rounded-[1.5rem] outline-none focus:border-blue-500 font-bold text-sm md:text-base" />
                 </div>

                 <div>
                   <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 px-1 md:px-2">Professional Headline</label>
                   <input type="text" value={editForm.headline} onChange={e => setEditForm({...editForm, headline: e.target.value})} className="w-full border-2 border-gray-100 p-3 md:p-4 bg-gray-50 hover:bg-white rounded-xl md:rounded-[1.5rem] outline-none focus:border-blue-500 focus:bg-white font-bold transition-all text-sm md:text-base" />
                 </div>
                 
                 <div>
                   <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 px-1 md:px-2">About Section</label>
                   <textarea value={editForm.about} onChange={e => setEditForm({...editForm, about: e.target.value})} className="w-full border-2 border-gray-100 p-3 md:p-4 bg-gray-50 hover:bg-white rounded-xl md:rounded-[1.5rem] h-24 md:h-32 resize-none outline-none focus:border-blue-500 focus:bg-white font-bold transition-all custom-scrollbar text-sm md:text-base"></textarea>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                   <div>
                     <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 px-1 md:px-2">Experience</label>
                     <textarea value={editForm.experience} onChange={e => setEditForm({...editForm, experience: e.target.value})} className="w-full border-2 border-gray-100 p-3 md:p-4 bg-gray-50 hover:bg-white rounded-xl md:rounded-[1.5rem] h-24 resize-none outline-none focus:border-blue-500 focus:bg-white font-bold transition-all custom-scrollbar text-sm md:text-base"></textarea>
                   </div>
                   <div>
                     <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 px-1 md:px-2">Education</label>
                     <textarea value={editForm.education} onChange={e => setEditForm({...editForm, education: e.target.value})} className="w-full border-2 border-gray-100 p-3 md:p-4 bg-gray-50 hover:bg-white rounded-xl md:rounded-[1.5rem] h-24 resize-none outline-none focus:border-blue-500 focus:bg-white font-bold transition-all custom-scrollbar text-sm md:text-base"></textarea>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">GitHub Link</label>
                      <input type="url" value={editForm.github} onChange={e => setEditForm({...editForm, github: e.target.value})} className="w-full border-2 border-gray-100 p-3 bg-gray-50 rounded-xl outline-none focus:border-blue-500 font-bold text-sm" placeholder="https://" />
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">LinkedIn Link</label>
                      <input type="url" value={editForm.linkedin} onChange={e => setEditForm({...editForm, linkedin: e.target.value})} className="w-full border-2 border-gray-100 p-3 bg-gray-50 rounded-xl outline-none focus:border-blue-500 font-bold text-sm" placeholder="https://" />
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Resume Link</label>
                      <input type="url" value={editForm.resumeLink} onChange={e => setEditForm({...editForm, resumeLink: e.target.value})} className="w-full border-2 border-gray-100 p-3 bg-gray-50 rounded-xl outline-none focus:border-blue-500 font-bold text-sm" placeholder="Drive / PDF URL" />
                    </div>
                 </div>
               </div>
               
               <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-6 md:mt-10 pt-6 md:pt-8 border-t border-gray-100 shrink-0">
                 <button onClick={() => setIsEditProfileOpen(false)} className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 md:py-4 rounded-full font-black transition-colors text-sm md:text-base">Cancel</button>
                 <button onClick={handleSaveProfile} className="w-full sm:flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 md:py-4 rounded-full font-black shadow-xl shadow-blue-600/20 hover:-translate-y-1 transition-all text-sm md:text-base">Save Full Profile</button>
               </div>
             </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  );
}