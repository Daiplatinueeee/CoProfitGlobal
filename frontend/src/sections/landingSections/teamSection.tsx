'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

import cel from '../../assets/celso.webp';
import glende from '../../assets/glende.webp';
import elmer from '../../assets/elmer.webp';

const teamMembers = [
    {
        id: 7,
        name: 'Elmer Alo Desamparado',
        role: 'Chief Executive Officer & President',
        bio: 'Elmer Alo Desamparado is a servant-visionary leader from Bantayan Island, Cebu, with a background in education, network marketing, and business leadership. A graduate of the University of Cebu with a degree in Secondary Education major in General Science and Physics, he is a licensed Financial Advisor and Real Estate Salesperson. Currently serving as CEO and President of CoProfit Global Corporation, Elmer oversees multiple branches and area stockists nationwide, bringing extensive leadership experience, resilience, and a strong commitment to excellence and professional growth.',
        image: elmer,
        initials: 'ED',
    },
    {
        id: 2,
        name: 'Celso Lagancia',
        role: 'Chief Operating Officer',
        bio: "Celso Lagancia is a Cebu-based businessman and entrepreneur from Camotes Island. Currently studying at the Maritime School of the University of Cebu, he serves as Chief Operating Officer of CoProfit Global Corporation, overseeing operations across three branches and managing over ten area stockists nationwide, contributing significantly to the company's growth and success.",
        image: cel,
        initials: 'CL',
    },
    {
        id: 4,
        name: 'Glende S. Pastorpili',
        role: 'VP – Administrative',
        bio: 'Glende Sagarino Pastorpili is a dynamic entrepreneur and business leader from Carnaza Island, Daan Bantayan, Cebu. Currently pursuing a BS in Information Technology at the University of Cebu, she combines her academic training with extensive experience in the networking marketing industry. Formerly serving as Executive Director and now Vice President for Administration, Glende is recognized for her strategic leadership, commitment to continuous learning, and passion for empowering others through mentorship and professional development.',
        image: glende,
        initials: 'GP',
    },
];

type Member = (typeof teamMembers)[0];

function MemberCard({ member, onClick }: { member: Member; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer rounded-2xl overflow-hidden bg-[#0d0d0d] border border-white/5 hover:border-yellow-600/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(202,138,4,0.2)]"
        >
            {/* Photo */}
            <div className="relative overflow-hidden aspect-3/4">
                <img
                    src={member.image || '/placeholder.svg'}
                    alt={member.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                {/* gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />

                {/* name + role pinned to bottom */}
                <div className="absolute bottom-0 inset-x-0 p-4">
                    <p className="text-white font-semibold text-sm leading-tight">{member.name}</p>
                    <p className="text-yellow-500 text-[11px] mt-0.5 leading-snug">{member.role}</p>
                </div>

                {/* hover pill */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-yellow-500 text-black text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg">
                        View Bio
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function TeamSection() {
    const [selected, setSelected] = useState<Member | null>(null);

    return (
        <section
            id="team"
            className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#080808] border-b border-yellow-900/30 overflow-hidden"
        >
            {/* dot grid background */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(circle, #ca8a04 1px, transparent 1px)`,
                    backgroundSize: '32px 32px',
                }}
            />
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-150 h-64 bg-yellow-600/5 rounded-full blur-3xl" />

            <div className="relative max-w-6xl mx-auto">

                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <span className="h-px w-8 bg-yellow-600/50" />
                        <p className="text-yellow-600 text-[11px] tracking-[0.4em] uppercase font-medium">
                            CoProfit Global Corporation
                        </p>
                        <span className="h-px w-8 bg-yellow-600/50" />
                    </div>
                    <h1 className="text-5xl sm:text-6xl text-white font-light tracking-tight mb-4">
                        Our <span className="text-yellow-500 font-semibold">Management</span>
                    </h1>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                        Meet the people driving CoProfit forward
                    </p>
                </div>

                {/* Card grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-3">
                    {teamMembers.map((m) => (
                        <MemberCard key={m.id} member={m} onClick={() => setSelected(m)} />
                    ))}
                </div>

                <p className="mt-10 text-center text-gray-700 text-xs tracking-widest uppercase">
                    Click any card to read full profile
                </p>
            </div>

            {/* Modal */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="relative bg-[#0a0a0a] border border-yellow-700/30 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col sm:flex-row shadow-[0_0_80px_rgba(202,138,4,0.2)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelected(null)}
                            className="absolute top-4 right-4 z-10 bg-yellow-500 hover:bg-yellow-300 text-black rounded-full p-1.5 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        {/* photo */}
                        <div className="sm:w-2/5 shrink-0 rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none overflow-hidden">
                            <img
                                src={selected.image || '/placeholder.svg'}
                                alt={selected.name}
                                className="w-full h-64 sm:h-full object-cover object-top"
                            />
                        </div>

                        {/* bio */}
                        <div className="sm:w-3/5 p-7 sm:p-10 flex flex-col justify-center gap-4">
                            <div>
                                <p className="text-yellow-600 text-[10px] tracking-[0.35em] uppercase mb-1">
                                    {selected.role}
                                </p>
                                <h2 className="text-2xl sm:text-3xl text-white font-light leading-tight">
                                    {selected.name}
                                </h2>
                            </div>
                            <div className="w-10 h-px bg-yellow-600/60" />
                            <p className="text-gray-400 text-sm leading-relaxed">{selected.bio}</p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}