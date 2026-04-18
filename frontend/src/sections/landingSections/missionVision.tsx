import ms1 from "../../assets/ms1.webp";
import ms2 from "../../assets/ms2.webp";

export default function MissionVisionSection() {
    return (
        <section id="mission" className="py-20 px-4 sm:px-6 lg:px-8 bg-black min-h-screen flex items-center border-b border-yellow-600">
            <div className="max-w-7xl mx-auto w-full">
                <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                    {/* Mission - Left Image */}
                    <div className="order-2 md:order-1">
                        <img
                            src={ms1 || "/placeholder.svg"}
                            alt="Mission"
                            className="w-full"
                        />
                    </div>

                    {/* Mission - Right Text */}
                    <div className="order-1 md:order-2 text-white space-y-6">
                        <div>
                            <h2 className="text-5xl mb-4 text-yellow-500">Core Values</h2>
                            <p className="text-lg text-gray-300 leading-relaxed">
                                To create exceptional products that inspire confidence and elevate everyday moments. We are committed to delivering luxury that is accessible, sustainable, and meaningful to our community.
                            </p>
                        </div>
                        <div className="border-l-4 border-yellow-500 pl-6">
                            <p className="text-yellow-500 font-semibold mb-2">Core Values</p>
                            <ul className="text-gray-300 space-y-2">
                                <li>• Commitment</li>
                                <li>• Ownership</li>
                                <li>• Passion</li>
                                <li>• Respect</li>
                                <li>• Optimism</li>
                                <li>• Family</li>
                                <li>• Integrity</li>
                                <li>• Teamwork</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12 items-center">
                    {/* Vision - Left Text */}
                    <div className="text-white space-y-6">
                        <div>
                            <h2 className="text-5xl mb-4 text-yellow-500">Our Vision & Mission</h2>
                            <p className="text-lg text-gray-300 leading-relaxed">
                                To become the global benchmark for luxury and authenticity. We envision a world where quality craftsmanship is celebrated, and every customer feels valued as part of our extended family.
                            </p>
                        </div>
                        <div className="border-l-4 border-yellow-500 pl-6">
                            <p className="text-yellow-500 font-semibold mb-2">2030 Goals</p>
                            <ul className="text-gray-300 space-y-2">
                                <li>• Expand to 50 retail locations</li>
                                <li>• 100% sustainable sourcing</li>
                                <li>• Digital transformation</li>
                                <li>• Global community impact</li>
                            </ul>
                        </div>
                    </div>

                    {/* Vision - Right Image */}
                    <div>
                        <img
                            src={ms2 || "/placeholder.svg"}
                            alt="Vision"
                            className="w-full"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}