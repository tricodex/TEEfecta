"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiArrowLeft, 
  FiArrowRight, 
  FiCheck,
  FiServer,
  FiDatabase,
  FiShield,
  FiSearch,
  FiBarChart2,
  FiActivity,
  FiLock,
  FiCpu,
  FiCode
} from "react-icons/fi";

interface SlideProps {
  children: React.ReactNode;
  bgColor?: string;
}

const Slide: React.FC<SlideProps> = ({ children, bgColor = "bg-black" }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`w-full h-screen flex flex-col items-center justify-center p-10 ${bgColor} text-white`}
    >
      {children}
    </motion.div>
  );
};

const slideContent = [
  // Introduction
  {
    title: "4g3n7 Auto Trader",
    subtitle: "Secure Trading Agents in TEEs",
    content: (
      <div className="flex flex-col items-center space-y-6 text-center max-w-4xl">
        <Image 
          src="/437.png" 
          alt="4g3n7 Auto Trader Logo" 
          width={400} 
          height={200}
          className="mb-4" 
        />
        <h2 className="text-3xl font-bold text-white">Secure Autonomous Trading with Trusted Execution Environments</h2>
        <p className="text-xl text-gray-300">
          4g3n7 Auto Trader combines AgentKit's wallet capabilities with Marlin's TEE infrastructure
          to create a cryptographically verified trading system with attestation guarantees.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <div className="flex items-center bg-blue-900 px-4 py-2 rounded-full">
            <FiShield className="text-blue-300 mr-2" />
            <span className="text-blue-200">TEE Security</span>
          </div>
          <div className="flex items-center bg-green-900 px-4 py-2 rounded-full">
            <FiDatabase className="text-green-300 mr-2" />
            <span className="text-green-200">AgentKit Integration</span>
          </div>
          <div className="flex items-center bg-purple-900 px-4 py-2 rounded-full">
            <FiLock className="text-purple-300 mr-2" />
            <span className="text-purple-200">Trusted Trading</span>
          </div>
        </div>
      </div>
    ),
  },
  
  // System Architecture
  {
    title: "System Architecture",
    subtitle: "Core Components",
    content: (
      <div className="flex flex-col items-center max-w-5xl">
        <h2 className="text-3xl font-bold mb-10 text-white">System Architecture</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <FiDatabase className="text-blue-300 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Dual-Agent Framework</h3>
            <p className="text-gray-300">
              Combines a traditional trading agent with an AgentKit-powered agent for broader market insights.
            </p>
          </div>
          
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-green-900 rounded-full flex items-center justify-center mb-4">
              <FiBarChart2 className="text-green-300 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Memory Management</h3>
            <p className="text-gray-300">
              Transparent record-keeping with RecallMemoryManager for audit trails and decision tracking.
            </p>
          </div>
          
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-purple-900 rounded-full flex items-center justify-center mb-4">
              <FiCpu className="text-purple-300 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Two-Tier Architecture</h3>
            <p className="text-gray-300">
              Attestation service in Marlin CVM with full backend on traditional VPS for optimal security.
            </p>
          </div>
          
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-red-900 rounded-full flex items-center justify-center mb-4">
              <FiSearch className="text-red-300 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">LLM-Powered Analysis</h3>
            <p className="text-gray-300">
              Market analysis with Gemini 2.0 Flash inside the secure TEE environment.
            </p>
          </div>
          
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-yellow-900 rounded-full flex items-center justify-center mb-4">
              <FiServer className="text-yellow-300 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">WebSocket Integration</h3>
            <p className="text-gray-300">
              Real-time updates via Socket.IO with attestation-verified data streams.
            </p>
          </div>
          
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-indigo-900 rounded-full flex items-center justify-center mb-4">
              <FiShield className="text-indigo-300 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Attestation System</h3>
            <p className="text-gray-300">
              Verifies specific ARM64 PCR values and Docker digest values for integrity.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  
  // Marlin TEE Integration
  {
    title: "Marlin TEE Integration",
    subtitle: "Security Features",
    content: (
      <div className="flex flex-col items-center max-w-4xl">
        <h2 className="text-3xl font-bold mb-10 text-white">Marlin TEE Integration</h2>
        
        <div className="w-full bg-gray-900 rounded-lg p-6 font-mono text-sm mb-8">
          <div className="flex items-center mb-2">
            <span className="text-gray-500">$</span>
            <span className="ml-2 text-gray-300">cat FINAL_VERIFICATION_REPORT.md</span>
          </div>
          <div className="bg-gray-950 text-green-400 p-4 rounded overflow-auto max-h-64 w-full">
            <pre className="text-xs">
{`# Marlin CVM E2E Verification and Agent Attestation Final Report

## Executive Summary

The end-to-end verification of the Marlin CVM and agent attestation process has been 
completed successfully. **The agents are properly verified in the CVM environment**,
establishing a strong chain of trust from deployment to execution.

## PCR Measurements

The expected PCR measurements for ARM64 instances have been verified:

| PCR | Value | Status |
|-----|-------|--------|
| PCR0 | 0d8c50f0d0e9ecf25c48ba9ed1d8d5dc475be1dba553a0ef299f385bd7447220 | ✅ Verified |
| PCR1 | d71f06f25bcd891848eecfcd65688831d9acf4be17da631b15fb5b1ecd7c3d23 | ✅ Verified |
| PCR2 | bd79abe09f36d95bb28c08d6f9d758c3bddebc6aa634b8c65cbae4b4b54a4146 | ✅ Verified |`}
            </pre>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">Two-Tier Architecture</h3>
            <p className="text-gray-300 mb-4">
              Our system uses a two-tier architecture with a minimal attestation service in Marlin CVM
              and a full backend server on a traditional VPS that verifies attestations before operations.
            </p>
            <div className="mt-4 text-sm bg-gray-950 p-3 rounded-md overflow-x-auto text-white">
              <code>
                {`// Deploy Attestation Service on Marlin CVM
./minimal-deploy.sh

// Verify Attestation
./arbitrum-attestation.sh

// Run Backend with Attestation Integration
export ATTESTATION_FILE=./attestation-data.json
export ENABLE_ATTESTATION=true
bun run start`}
              </code>
            </div>
          </div>
          
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">Verification Details</h3>
            <p className="text-gray-300 mb-4">
              Our system verifies both PCR values and Docker digest values to ensure
              complete integrity of the execution environment, with multiple verification layers.
            </p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-900 flex items-center justify-center mt-1">
                  <FiCheck className="text-green-300 text-sm" />
                </div>
                <span className="ml-2">Docker Compose digest validation</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-900 flex items-center justify-center mt-1">
                  <FiCheck className="text-green-300 text-sm" />
                </div>
                <span className="ml-2">Offline attestation verification capability</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-900 flex items-center justify-center mt-1">
                  <FiCheck className="text-green-300 text-sm" />
                </div>
                <span className="ml-2">Attestation freshness with timestamp checking</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  
  // Add a WebSocket Implementation Slide
  {
    title: "WebSocket Integration",
    subtitle: "Real-time Trading Updates",
    content: (
      <div className="flex flex-col items-center max-w-4xl">
        <h2 className="text-3xl font-bold mb-10 text-white">WebSocket Integration</h2>
        
        <div className="grid grid-cols-1 gap-8 w-full">
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">Real-Time Trading Updates</h3>
            <div className="text-sm bg-gray-950 p-4 rounded-md overflow-x-auto text-white mb-4">
              <code>
{`// Backend WebSocket Server Configuration
this.io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Frontend connection setup
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3222";`}
              </code>
            </div>
            <p className="text-gray-300">
              Our WebSocket implementation provides real-time trading updates with attestation verification,
              ensuring all data comes from the verified trading environment.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-blue-900 rounded-full flex items-center justify-center">
                  <FiServer className="text-blue-300" />
                </div>
                <h3 className="ml-3 text-xl font-bold text-white">Socket.IO Backend</h3>
              </div>
              <p className="text-gray-300">
                Socket.IO server implementation with secure CORS settings and
                subscription management for different trading topics.
              </p>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-purple-900 rounded-full flex items-center justify-center">
                  <FiActivity className="text-purple-300" />
                </div>
                <h3 className="ml-3 text-xl font-bold text-white">Event Broadcasting</h3>
              </div>
              <p className="text-gray-300">
                Real-time broadcasting of trading events, market analysis data,
                and system status including attestation verification.
              </p>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-green-900 rounded-full flex items-center justify-center">
                  <FiDatabase className="text-green-300" />
                </div>
                <h3 className="ml-3 text-xl font-bold text-white">React Context Integration</h3>
              </div>
              <p className="text-gray-300">
                React context provider for WebSocket functionality with
                component lifecycle management and connection status handling.
              </p>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-red-900 rounded-full flex items-center justify-center">
                  <FiShield className="text-red-300" />
                </div>
                <h3 className="ml-3 text-xl font-bold text-white">Verified Data Streams</h3>
              </div>
              <p className="text-gray-300">
                All WebSocket data is verified against attestation signatures,
                ensuring trading data comes from the verified environment.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  
  // AgentKit Integration
  {
    title: "AgentKit Integration",
    subtitle: "Trading Capabilities",
    content: (
      <div className="flex flex-col items-center max-w-4xl">
        <h2 className="text-3xl font-bold mb-10 text-white">AgentKit Integration</h2>
        
        <div className="grid grid-cols-1 gap-8 w-full">
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">AgentKit Trading Agent</h3>
            <div className="text-sm bg-gray-950 p-4 rounded-md overflow-x-auto text-white mb-4">
              <code>
{`class AgentKitTradingAgent implements Agent {
  private agentKit: AgentKit;
  private llmService: LLMService;
  private memoryManager: RecallMemoryManager;
  private walletAddress: string;
  
  constructor(
    agentKit: AgentKit,
    llmService: LLMService,
    memoryManager: RecallMemoryManager,
    walletAddress: string
  ) {
    this.agentKit = agentKit;
    this.llmService = llmService;
    this.memoryManager = memoryManager;
    this.walletAddress = walletAddress;
  }
  
  // Agent methods implementation...
}`}
              </code>
            </div>
            <p className="text-gray-300">
              Our implementation leverages AgentKit's wallet capabilities and action providers 
              to perform secure trading operations with full attestation verification.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-blue-900 rounded-full flex items-center justify-center">
                  <FiCode className="text-blue-300" />
                </div>
                <h3 className="ml-3 text-xl font-bold text-white">Trade Execution</h3>
              </div>
              <p className="text-gray-300">
                Secure trade execution using AgentKit's CDP wallet providers and action system, 
                running within the verified TEE environment.
              </p>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-purple-900 rounded-full flex items-center justify-center">
                  <FiActivity className="text-purple-300" />
                </div>
                <h3 className="ml-3 text-xl font-bold text-white">Strategy Coordination</h3>
              </div>
              <p className="text-gray-300">
                Coordinated trading strategies between traditional and AgentKit agents, 
                ensuring optimal decision-making with memory consistency.
              </p>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-green-900 rounded-full flex items-center justify-center">
                  <FiDatabase className="text-green-300" />
                </div>
                <h3 className="ml-3 text-xl font-bold text-white">Memory Management</h3>
              </div>
              <p className="text-gray-300">
                Transparent record-keeping with RecallMemoryManager for audit trails 
                and verifiable decision tracking.
              </p>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-red-900 rounded-full flex items-center justify-center">
                  <FiShield className="text-red-300" />
                </div>
                <h3 className="ml-3 text-xl font-bold text-white">Attestation-First Security</h3>
              </div>
              <p className="text-gray-300">
                All AgentKit operations are gated by attestation verification,
                ensuring they only execute in the verified environment.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  
  // Conclusion
  {
    title: "Conclusion",
    subtitle: "Summary",
    content: (
      <div className="flex flex-col items-center max-w-4xl">
        <Image 
          src="/437.png" 
          alt="4g3n7 Auto Trader Logo" 
          width={300} 
          height={150}
          className="mb-8" 
        />
        <h2 className="text-3xl font-bold mb-8 text-white">4g3n7 Auto Trader: Secure Trading Agents in TEEs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">Key Innovations</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center mt-1">
                  <FiShield className="text-blue-300 text-sm" />
                </div>
                <span className="ml-2 text-gray-300">Cryptographically verified trading agent operations</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-900 flex items-center justify-center mt-1">
                  <FiBarChart2 className="text-green-300 text-sm" />
                </div>
                <span className="ml-2 text-gray-300">Dual-layer security with AgentKit and TEE protection</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yellow-900 flex items-center justify-center mt-1">
                  <FiDatabase className="text-yellow-300 text-sm" />
                </div>
                <span className="ml-2 text-gray-300">Tamper-proof trading decisions with TEE protection</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-900 flex items-center justify-center mt-1">
                  <FiSearch className="text-purple-300 text-sm" />
                </div>
                <span className="ml-2 text-gray-300">Transparent, verifiable record-keeping in Recall</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-900 p-6 rounded-xl shadow-md border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">Security Benefits</h3>
            <div className="space-y-4">
              <div className="bg-blue-950 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-blue-300 mb-1">Cryptographic Verification</h4>
                <p className="text-blue-200 text-sm">
                  Every trading decision is executed in a verified TEE with
                  cryptographic guarantees of code integrity.
                </p>
              </div>
              
              <div className="bg-green-950 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-green-300 mb-1">Protected Private Keys</h4>
                <p className="text-green-200 text-sm">
                  Wallet private keys are secured within the TEE, inaccessible
                  to the host OS or potential attackers.
                </p>
              </div>
              
              <div className="bg-purple-950 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-purple-300 mb-1">Complete Chain of Trust</h4>
                <p className="text-purple-200 text-sm">
                  Verified chain of trust from deployment to execution,
                  with continuous re-attestation for ongoing security.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-10 text-center">
          <p className="text-xl text-gray-300 mb-4">
            4g3n7 Auto Trader provides a new paradigm for secure autonomous trading with
            cryptographic guarantees rather than blind trust.
          </p>
          <p className="text-gray-500">
            TEEfecta Hackathon - AgentKit & Marlin TEE Integration
          </p>
        </div>
      </div>
    ),
  },
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTouchStarted, setIsTouchStarted] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slideContent.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      nextSlide();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      prevSlide();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouchStarted(true);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchStarted) return;
    
    const touchEndX = e.touches[0].clientX;
    const diff = touchStartX - touchEndX;
    
    // If swipe is significant enough
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left, go to next slide
        nextSlide();
      } else {
        // Swipe right, go to previous slide
        prevSlide();
      }
      setIsTouchStarted(false);
    }
  };

  const handleTouchEnd = () => {
    setIsTouchStarted(false);
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentSlide]);

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >

      <AnimatePresence mode="wait">
        <Slide key={currentSlide}>
          {slideContent[currentSlide].content}
        </Slide>
      </AnimatePresence>
      
      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center space-x-2">
        {slideContent.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full ${
              index === currentSlide ? "bg-blue-500" : "bg-gray-600"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="absolute top-6 left-6 text-gray-300 font-medium">
        {slideContent[currentSlide].title}
        {slideContent[currentSlide].subtitle && (
          <span className="text-gray-500 ml-2">— {slideContent[currentSlide].subtitle}</span>
        )}
      </div>
      
      <div className="absolute bottom-6 right-6 flex space-x-2">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className={`p-2 rounded-full ${
            currentSlide === 0
              ? "text-gray-700 cursor-not-allowed"
              : "text-gray-300 hover:bg-gray-800"
          }`}
          aria-label="Previous slide"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextSlide}
          disabled={currentSlide === slideContent.length - 1}
          className={`p-2 rounded-full ${
            currentSlide === slideContent.length - 1
              ? "text-gray-700 cursor-not-allowed"
              : "text-gray-300 hover:bg-gray-800"
          }`}
          aria-label="Next slide"
        >
          <FiArrowRight className="w-5 h-5" />
        </button>
      </div>
      
      <div className="absolute bottom-6 left-6 text-sm text-gray-500">
        {currentSlide + 1} / {slideContent.length}
      </div>
    </div>
  );
}
