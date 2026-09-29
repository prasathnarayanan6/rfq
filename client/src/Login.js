import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import logo from './assets/Red_Beige_Minimal_Simple_Typographic_Chic_Logo-removebg-preview.png';
import LoginAPI from './API/loginAPI';
import CustomCloseButton from './utils/CustomeCloseButton';
import 'react-toastify/dist/ReactToastify.css';
import { Button, IconButton, InputAdornment, TextField } from '@mui/material';

const highlights = [
  'Organize vendor data in one workspace',
  'Prepare intelligent outreach workflows',
  'Keep every procurement conversation focused',
];

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({ user_mail: '', user_password: '' });
  const navigate = useNavigate();

  const handleChange = ({ target: { name, value } }) => {
    setUserData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userData.user_mail.trim() || !userData.user_password) {
      toast.error('Please enter your email and password', {
        autoClose: 3000, toastId: 'input-missing', icon: false, closeButton: CustomCloseButton,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await LoginAPI(userData);
      localStorage.setItem('user_token', response.data.accessToken);
      localStorage.setItem('people_id', response.data.people_id);
      sessionStorage.setItem('user_name', response.data.name);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = error?.response?.data?.code === 429
        ? error.response.data.status
        : error?.response?.data?.code === 500
          ? 'Login service is currently unavailable'
          : 'The email or password is incorrect';
      toast.error(message, {
        toastId: 'login-error', autoClose: 3000, icon: false, closeButton: CustomCloseButton,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f7f9] lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#111827] px-12 py-10 text-white lg:flex lg:flex-col xl:px-20 xl:py-14">
        <div className="absolute -left-36 top-1/3 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute -right-40 -top-32 h-[30rem] w-[30rem] rounded-full bg-red-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/5 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="rounded-xl bg-white px-3 py-2 shadow-xl shadow-black/20">
            <img src={logo} alt="Supply.ai" className="h-8 w-auto" />
          </div>
          <span className="text-sm font-medium text-slate-300">Procurement workspace</span>
        </div>

        <div className="relative z-10 my-auto max-w-2xl animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.18em] text-red-200 backdrop-blur">
            <Sparkles size={14} /> Built for smarter sourcing
          </div>
          <h2 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
            Better vendor decisions start with better conversations.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Bring vendor discovery, structured outreach, and procurement context together in a workspace your team can move through with confidence.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-slate-200">
                <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-red-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-400">
          <span>Supply.ai RFQ Portal</span>
          <span className="flex items-center gap-2"><ShieldCheck size={15} /> Secure workspace access</span>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-700 via-brand-500 to-orange-400 lg:hidden" />
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <img src={logo} alt="Supply.ai" className="h-11 w-auto" />
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm">RFQ Portal</span>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-brand-600">Welcome back</p>
            <h1 className="text-4xl font-semibold tracking-tight text-ink">Login to your workspace</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">Enter your account details to continue managing vendors and outreach.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <TextField
              fullWidth
              type="email"
              label="Email address"
              placeholder="you@company.com"
              value={userData.user_mail}
              onChange={handleChange}
              name="user_mail"
              autoComplete="email"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><Mail size={18} className="text-slate-400" /></InputAdornment>,
                },
              }}
            />

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Enter your password"
              value={userData.user_password}
              onChange={handleChange}
              name="user_password"
              autoComplete="current-password"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><LockKeyhole size={18} className="text-slate-400" /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        size="small"
                        edge="end"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mt: 1, py: 1.45, fontSize: 14 }}>
              {loading
                ? <><ClipLoader color="#ffffff" size={18} /> Signing you in…</>
                : <>Login securely <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            Protected access for authorized procurement teams.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
