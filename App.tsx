import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Send, 
  CheckCircle2, 
  User, 
  Briefcase, 
  Gift, 
  ArrowRight,
  Sparkles,
  PieChart,
  RefreshCcw,
  Plus,
  Minus
} from 'lucide-react';
import Calendar from './components/Calendar';
import { LeaveType, DurationType, LeaveRequest, MANAGER_EMAIL, USER_NAME } from './types';
import { generateLeaveEmailDraft } from './services/ai';

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{subject: string, body: string} | null>(null);
  
  // Statistics State
  const [stats, setStats] = useState({
    annual: { total: 12, used: 0 },
    sick: { total: 0, used: 0 },
    birthday: { total: 1, used: 0 }
  });

  // Leave History State
  const [leaveHistory, setLeaveHistory] = useState<Array<{
    id: string;
    type: string;
    duration: number;
    dates: string;
  }>>([]);
  
  // State for expanding/collapsing history per leave type
  const [expandedStats, setExpandedStats] = useState<Record<string, boolean>>({});

  const toggleStatHistory = (key: string) => {
    setExpandedStats(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [formData, setFormData] = useState<LeaveRequest>({
    type: null,
    dates: [],
    durationType: DurationType.FULL_DAY,
    halfDayPeriod: 'AM',
    startHour: '09:00',
    endHour: '18:00'
  });

  const handleNext = async () => {
    if (step === 3) {
      // Move to review and generate AI email
      setStep(4);
      setIsGenerating(true);
      try {
        const remainingAnnual = stats.annual.total - stats.annual.used;
        const draft = await generateLeaveEmailDraft(formData, remainingAnnual);
        setGeneratedEmail(draft);
      } catch (e) {
        console.error(e);
      } finally {
        setIsGenerating(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const calculateLeaveDuration = (): number => {
    const daysCount = formData.dates.length;
    if (daysCount === 0) return 0;

    let unitDuration = 0;
    if (formData.durationType === DurationType.FULL_DAY) {
      unitDuration = 1;
    } else if (formData.durationType === DurationType.HALF_DAY) {
      unitDuration = 0.5;
    } else if (formData.durationType === DurationType.HOURS) {
      const [startH, startM] = formData.startHour.split(':').map(Number);
      const [endH, endM] = formData.endHour.split(':').map(Number);
      const startVal = startH + startM / 60;
      const endVal = endH + endM / 60;
      const diff = endVal - startVal;
      // Assuming 8 hours is a full work day for calculation
      unitDuration = diff > 0 ? (diff / 8) : 0;
    }
    
    return parseFloat((unitDuration * daysCount).toFixed(2));
  };

  const handleSubmit = () => {
    if (!generatedEmail) return;
    
    // 1. Calculate duration
    const duration = calculateLeaveDuration();

    // 2. Update Stats
    setStats(prev => {
      const newStats = { ...prev };
      if (formData.type === LeaveType.ANNUAL) {
        newStats.annual = { ...prev.annual, used: parseFloat((prev.annual.used + duration).toFixed(2)) };
      } else if (formData.type === LeaveType.SICK) {
        newStats.sick = { ...prev.sick, used: parseFloat((prev.sick.used + duration).toFixed(2)) };
      } else if (formData.type === LeaveType.BIRTHDAY) {
        newStats.birthday = { ...prev.birthday, used: parseFloat((prev.birthday.used + duration).toFixed(2)) };
      }
      return newStats;
    });

    // 3. Update History
    if (formData.type) {
      setLeaveHistory(prev => [{
        id: Date.now().toString(),
        type: formData.type!,
        duration: duration,
        dates: formData.dates.map(d => d.toLocaleDateString()).join(', ')
      }, ...prev]);
    }
    
    // 4. Open email client
    const subject = encodeURIComponent(generatedEmail.subject);
    const body = encodeURIComponent(generatedEmail.body);
    const mailtoLink = `mailto:${MANAGER_EMAIL}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
    
    // 5. Notify and Reset
    alert(`Email client opened!\n\nLeave Recorded: ${duration} days\nStatistics updated.`);
    
    // Reset to Step 1 for next request
    setStep(1);
    setGeneratedEmail(null);
    setFormData({
      type: null,
      dates: [],
      durationType: DurationType.FULL_DAY,
      halfDayPeriod: 'AM',
      startHour: '09:00',
      endHour: '18:00'
    });
  };

  const updateFormData = (field: keyof LeaveRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateSelect = (date: Date, isMulti: boolean) => {
    setFormData(prev => {
      const dateStr = date.toDateString();
      const exists = prev.dates.some(d => d.toDateString() === dateStr);
      
      let newDates: Date[];
      if (isMulti) {
        if (exists) {
          // Remove if exists
          newDates = prev.dates.filter(d => d.toDateString() !== dateStr);
        } else {
          // Add if not exists
          newDates = [...prev.dates, date];
        }
      } else {
        // Single select mode: replace
        newDates = [date];
      }
      
      // Sort dates
      newDates.sort((a, b) => a.getTime() - b.getTime());
      
      return { ...prev, dates: newDates };
    });
  };

  const steps = [
    { id: 1, title: 'Leave Type', icon: Briefcase },
    { id: 2, title: 'Date', icon: CalendarIcon },
    { id: 3, title: 'Duration', icon: Clock },
    { id: 4, title: 'Review', icon: Send },
  ];

  const handleResetStats = () => {
    if (window.confirm('Reset all statistics and history?')) {
      setStats({
        annual: { total: 12, used: 0 },
        sick: { total: 0, used: 0 },
        birthday: { total: 1, used: 0 }
      });
      setLeaveHistory([]);
    }
  };

  const renderStatBlock = (
    key: 'annual' | 'sick' | 'birthday', 
    type: LeaveType, 
    label: string, 
    color: 'blue' | 'red' | 'purple'
  ) => {
    const data = stats[key];
    const history = leaveHistory.filter(h => h.type === type);
    const isExpanded = expandedStats[key];
    
    const colors = {
      blue: { bg: 'bg-blue-50/50', border: 'border-blue-100', dot: 'bg-blue-500' },
      red: { bg: 'bg-red-50/50', border: 'border-red-100', dot: 'bg-red-500' },
      purple: { bg: 'bg-purple-50/50', border: 'border-purple-100', dot: 'bg-purple-500' },
    }[color];

    return (
      <div className={`p-2 rounded-lg border ${colors.border} ${colors.bg} transition-all`}>
         {/* Main Stats Row */}
         <div className="flex justify-between items-center mb-1">
             <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
               <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></div> {label}
             </span>
             {key === 'annual' ? (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                   Rem: {(data.total - data.used).toFixed(2).replace(/\.00$/, '')}
                </span>
             ) : (
                <div className="text-right flex items-baseline gap-1">
                   <span className="text-sm font-bold text-slate-800">{data.used}</span>
                   <span className="text-[10px] text-slate-400">days</span>
                </div>
             )}
         </div>

         {/* Annual Progress Bar */}
         {key === 'annual' && (
           <>
              <div className="w-full bg-blue-200 rounded-full h-1 mb-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((data.used / data.total) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                 <span>Used: {data.used}</span>
                 <span>Total: {data.total}</span>
              </div>
           </>
         )}

         {/* History Toggle */}
         {history.length > 0 && (
           <div className="mt-2 pt-1 border-t border-slate-200/50">
             <button 
               onClick={() => toggleStatHistory(key)}
               className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 w-full transition-colors group"
             >
               <div className="p-0.5 rounded bg-white border border-slate-200 group-hover:border-slate-300">
                 {isExpanded ? <Minus size={8} /> : <Plus size={8} />}
               </div>
               <span>Show History ({history.length})</span>
             </button>
             
             {isExpanded && (
               <div className="mt-2 space-y-1.5 pl-1">
                 {history.map(item => (
                   <div key={item.id} className="text-[10px] text-slate-600 bg-white/50 p-1.5 rounded border border-slate-100">
                     <div className="flex justify-between items-start">
                       <span className="font-medium text-slate-800 leading-tight flex-1 mr-2">{item.dates}</span>
                       <span className="whitespace-nowrap font-mono text-slate-500 text-[9px] border border-slate-100 rounded px-1">{item.duration}d</span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
         )}
      </div>
    );
  };

  const renderStatsSideCard = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-8">
      {/* Compact Header */}
      <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart size={16} className="text-brand-400" />
          <h3 className="font-semibold text-xs">Statistics (統計)</h3>
        </div>
        <button 
          onClick={handleResetStats}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
          title="Reset Statistics"
        >
          <RefreshCcw size={12} />
        </button>
      </div>
      
      {/* Compact Body */}
      <div className="p-3 space-y-2">
        {renderStatBlock('annual', LeaveType.ANNUAL, 'Annual (年假)', 'blue')}
        {renderStatBlock('sick', LeaveType.SICK, 'Sick (病假)', 'red')}
        {renderStatBlock('birthday', LeaveType.BIRTHDAY, 'Birthday (生日假)', 'purple')}
      </div>
    </div>
  );

  const renderStep1_Type = () => (
    <div className="grid grid-cols-1 gap-4">
      {[
        { type: LeaveType.ANNUAL, icon: Briefcase, color: 'bg-blue-100 text-blue-600' },
        { type: LeaveType.SICK, icon: User, color: 'bg-red-100 text-red-600' },
        { type: LeaveType.BIRTHDAY, icon: Gift, color: 'bg-purple-100 text-purple-600' }
      ].map((item) => (
        <button
          key={item.type}
          onClick={() => {
            updateFormData('type', item.type);
            setStep(2); // Auto advance
          }}
          className={`
            p-5 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 hover:shadow-md
            ${formData.type === item.type 
              ? 'border-brand-600 bg-brand-50' 
              : 'border-slate-100 bg-white hover:border-brand-200'}
          `}
        >
          <div className={`p-3 rounded-full ${item.color}`}>
            <item.icon size={24} />
          </div>
          <span className="font-semibold text-lg text-slate-800">{item.type}</span>
          {formData.type === item.type && <CheckCircle2 className="ml-auto text-brand-600" />}
        </button>
      ))}
    </div>
  );

  const renderStep2_Date = () => (
    <div className="flex flex-col items-center">
      <div className="w-full text-center mb-2">
        {formData.dates.length > 0 && (
          <div className="inline-block px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full mb-2">
             {formData.dates.length} day{formData.dates.length > 1 ? 's' : ''} selected
          </div>
        )}
      </div>
      <Calendar 
        selectedDates={formData.dates} 
        onSelect={handleDateSelect} 
      />
      <div className="mt-6 w-full">
        <button
          onClick={handleNext}
          disabled={formData.dates.length === 0}
          className="btn-primary w-full"
        >
          Confirm Date{formData.dates.length > 1 ? 's' : ''} <ArrowRight className="ml-2 w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep3_Duration = () => (
    <div className="w-full">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        
        {/* Duration Tabs */}
        <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl">
          {Object.values(DurationType).map(type => (
            <button
              key={type}
              onClick={() => updateFormData('durationType', type)}
              className={`
                py-2 text-xs sm:text-sm font-medium rounded-lg transition-all
                ${formData.durationType === type 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              {type.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Dynamic Content based on Duration Type */}
        <div className="min-h-[120px] flex items-center justify-center">
          {formData.durationType === DurationType.FULL_DAY && (
            <div className="text-center text-slate-600">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p>Apply for Full Day Leave ({formData.dates.length} days)</p>
            </div>
          )}

          {formData.durationType === DurationType.HALF_DAY && (
            <div className="grid grid-cols-2 gap-4 w-full">
              {['AM', 'PM'].map((period) => (
                <button
                  key={period}
                  onClick={() => updateFormData('halfDayPeriod', period)}
                  className={`
                    p-4 rounded-xl border-2 font-semibold transition-all
                    ${formData.halfDayPeriod === period 
                      ? 'border-brand-600 bg-brand-50 text-brand-700' 
                      : 'border-slate-200 text-slate-600 hover:border-brand-200'}
                  `}
                >
                  {period} (Half Day)
                </button>
              ))}
            </div>
          )}

          {formData.durationType === DurationType.HOURS && (
            <div className="flex items-center gap-2 sm:gap-4 w-full justify-center">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 mb-1">Start</label>
                <input 
                  type="time" 
                  value={formData.startHour}
                  onChange={(e) => updateFormData('startHour', e.target.value)}
                  className="p-2 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <span className="text-slate-400 mt-4">-</span>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 mb-1">End</label>
                <input 
                  type="time" 
                  value={formData.endHour}
                  onChange={(e) => updateFormData('endHour', e.target.value)}
                  className="p-2 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <button onClick={handleNext} className="btn-primary w-full">
          Review Application <ArrowRight className="ml-2 w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep4_Review = () => (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-brand-600 p-4 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Summary
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Details Column */}
          <div className="space-y-3">
            <div className="bg-slate-50 p-4 rounded-xl space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-900">{formData.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dates</span>
                <div className="text-right">
                  {formData.dates.map(d => (
                    <div key={d.toString()} className="font-medium text-slate-900">
                      {d.toLocaleDateString()}
                    </div>
                  ))}
                  <div className="text-xs text-brand-600 mt-1">
                    ({formData.dates.length} days selected)
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium text-slate-900">
                  {formData.durationType === DurationType.HOURS 
                    ? `${formData.startHour} - ${formData.endHour}`
                    : formData.durationType === DurationType.HALF_DAY
                      ? `${formData.durationType} (${formData.halfDayPeriod})`
                      : formData.durationType}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                <span className="text-slate-700 font-semibold">Total Leave</span>
                <span className="font-bold text-brand-600">{calculateLeaveDuration()} days</span>
              </div>
            </div>
          </div>

          {/* Email Preview Column */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
               Email Preview
            </h3>
            
            {isGenerating ? (
              <div className="h-32 bg-slate-50 rounded-xl flex items-center justify-center flex-col text-slate-400 gap-2 border border-slate-100">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                <span className="text-xs">Drafting...</span>
              </div>
            ) : generatedEmail ? (
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-slate-700 relative group">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {generatedEmail.body}
                </div>
              </div>
            ) : (
              <div className="h-32 bg-red-50 rounded-xl flex items-center justify-center text-red-400 text-xs">
                Generation Failed
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <button 
            onClick={() => setStep(3)}
            className="text-slate-500 hover:text-slate-800 font-medium px-4 text-sm"
          >
            Back
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isGenerating || !generatedEmail}
            className={`
              btn-primary px-6 py-2.5 text-sm shadow-brand-500/20 shadow-lg
              ${(isGenerating || !generatedEmail) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            Send <Send className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 sm:px-6">
      <style>{`
        .btn-primary {
          @apply flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 active:scale-95;
        }
      `}</style>
      
      <div className="max-w-5xl w-full">
        
        {/* App Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
            Leave Management
          </h1>
          <p className="text-slate-500">
            Dec 2025 - Dec 2026 Session
          </p>
        </div>

        {/* Main Layout Container */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Statistics Sidebar - Moved to be FIRST in desktop view (Left Side) */}
          <div className="w-full lg:w-64 shrink-0 order-1">
            {renderStatsSideCard()}
          </div>
          
          {/* Form Steps (Main Content) - Moved to be SECOND in desktop view (Right Side) */}
          <div className="flex-1 w-full order-2">
             
             {/* Step Indicator */}
             <div className="mb-8 overflow-hidden">
                <div className="flex justify-between relative px-2">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-brand-500 -z-10 rounded-full transition-all duration-500"
                    style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                  ></div>
                  
                  {steps.map((s) => {
                    const isActive = step >= s.id;
                    const isCurrent = step === s.id;
                    return (
                      <div key={s.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                        <div 
                          className={`
                            w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                            ${isActive 
                              ? 'bg-brand-600 border-brand-600 text-white shadow-lg' 
                              : 'bg-white border-slate-300 text-slate-300'}
                          `}
                        >
                          <s.icon size={14} />
                        </div>
                        <span className={`text-[10px] sm:text-xs font-semibold ${isCurrent ? 'text-brand-600' : 'text-slate-400'}`}>
                          {s.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
             </div>

             {/* Dynamic Form Content */}
             <div className="animate-fade-in w-full max-w-lg mx-auto lg:mx-0 lg:max-w-none">
                {step === 1 && renderStep1_Type()}
                {step === 2 && renderStep2_Date()}
                {step === 3 && renderStep3_Duration()}
                {step === 4 && renderStep4_Review()}
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default App;