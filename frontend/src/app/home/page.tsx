"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ParticleBackground from "@/components/ParticleBackground";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  CircleDollarSign,
  Code2,
  FileCheck2,
  Fingerprint,
  Orbit,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import styles from "./home.module.css";

const EquidoxOrb = dynamic(() => import("@/components/EquidoxOrb"), {
  ssr: false,
});

const SIGNALS = [
  "Milestone escrow",
  "AI verification",
  "Stellar payouts",
  "On-chain reputation",
  "Grant reviews",
  "Transparent funding",
  "Testnet live",
  "Ship · Verify · Get paid",
  "No blind grants",
  "Evidence before escrow",
  "Review with confidence",
  "Reputation that travels",
  "Built for builders",
  "Designed for reviewers",
];

const PILLARS = [
  {
    number: "01",
    icon: Bot,
    title: "AI Analysis",
    body: "Repos, docs, and deploys scored into a structured verification report before anyone touches escrow.",
    stat: "Structured verification",
  },
  {
    number: "02",
    icon: ShieldCheck,
    title: "Stellar Payouts",
    body: "Milestone amounts lock on-chain. Release only after AI hash + reviewer approval - never a blind wire.",
    stat: "Soroban escrow",
  },
  {
    number: "03",
    icon: Fingerprint,
    title: "On-chain Reputation",
    body: "Every paid milestone updates verified delivery history you can carry across grants and hackathons.",
    stat: "Builder Passport",
  },
];

const FLOW = {
  builder: [
    {
      icon: Code2,
      label: "Connect",
      title: "Connect Freighter & open your grant",
      body: "Use your Stellar wallet to enter the grant and select the milestone you are ready to deliver.",
    },
    {
      icon: FileCheck2,
      label: "Deliver",
      title: "Share repo, demo, docs, and delivery notes",
      body: "Your delivery details are hashed and submitted on-chain for a transparent review.",
    },
    {
      icon: CircleDollarSign,
      label: "Verify",
      title: "Wait for AI + admin — release updates reputation",
      body: "Approval releases escrow to your wallet and updates your portable on-chain reputation.",
    },
  ],
  admin: [
    {
      icon: Wallet,
      label: "Fund",
      title: "Fund escrow, then open Review",
      body: "Define milestone acceptance criteria and lock its payout in Soroban escrow.",
    },
    {
      icon: Bot,
      label: "Analyze",
      title: "Run AI report and inspect the full delivery",
      body: "Review the submitted repo, docs, deployment, evidence scores, risks, and recommendation.",
    },
    {
      icon: ShieldCheck,
      label: "Decide",
      title: "Approve & release — or reject for resubmit",
      body: "Human judgment remains final while every decision stays connected to on-chain evidence.",
    },
  ],
} as const;

const FAQ = [
  {
    q: "Do I need mainnet funds to try Equidox?",
    a: "No. Equidox runs on Stellar Testnet. Fund your Freighter wallet with Friendbot, then create grants, deliver milestones, and run the full verify → approve → release loop.",
  },
  {
    q: "What does the AI actually review?",
    a: "Builders provide a GitHub repo, optional demo/docs URLs, and delivery notes. The verifier pulls repository evidence and scores quality, security, docs, coverage, and architecture.",
  },
  {
    q: "When do builders get paid?",
    a: "After delivery details are on-chain, AI verification is anchored, and an admin reviews and approves. Funds then release from grant escrow on Soroban to the builder address.",
  },
  {
    q: "How does reputation work?",
    a: "Completed milestones, funding received, and verification history stay linked to the builder’s Stellar address for a verifiable track record.",
  },
  {
    q: "Who can approve and release funds?",
    a: "Admins / grant reviewers using the Freighter wallet set as the grant reviewer. Builders deliver milestones; admins run AI review then Approve & Release or Reject.",
  },
];

function MagneticLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  const move = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    gsap.to(ref.current, {
      x: (event.clientX - rect.left - rect.width / 2) * 0.12,
      y: (event.clientY - rect.top - rect.height / 2) * 0.16,
      duration: 0.35,
      ease: "power2.out",
    });
  };

  const reset = () => {
    if (ref.current) {
      gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, .4)" });
    }
  };

  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={move}
      onMouseLeave={reset}
      className={`${styles.magnetic} ${primary ? styles.primaryCta : styles.secondaryCta}`}
    >
      {children}
    </Link>
  );
}

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState<keyof typeof FLOW>("builder");
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [pointer, setPointer] = useState({ x: 50, y: 30 });
  const activeFlow = useMemo(() => FLOW[role], [role]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const scrollContainer = root.closest("main") as HTMLElement | null;
    const scroller = scrollContainer || undefined;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-hero-kicker]", { opacity: 0, y: 16, duration: 0.5 })
        .from(
          "[data-hero-line]",
          { yPercent: 115, rotate: 2, duration: 0.95, stagger: 0.1 },
          "-=.2"
        )
        .from("[data-hero-copy]", { opacity: 0, y: 24, duration: 0.65 }, "-=.45")
        .from("[data-hero-actions]", { opacity: 0, y: 18, duration: 0.55 }, "-=.4")
        .from("[data-orb]", { opacity: 0, scale: 0.82, duration: 1.1 }, "-=.9");

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          opacity: 0,
          y: 56,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            scroller,
            start: "top 86%",
            once: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-card]").forEach((card, index) => {
        gsap.from(card, {
          opacity: 0,
          y: 44,
          rotateX: 6,
          duration: 0.8,
          delay: index * 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            scroller,
            start: "top 88%",
            once: true,
          },
        });
      });

      ScrollTrigger.refresh();
    }, root);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const scrollContainer = root?.closest("main") as HTMLElement | null;
    const hero = root?.querySelector<HTMLElement>("[data-hero]");
    if (!root || !scrollContainer || !hero) return;

    let settleTimer = 0;
    let settleFrame = 0;

    const settleViewport = () => {
      if (scrollContainer.scrollTop < hero.offsetHeight * 0.5) {
        scrollContainer.scrollTo({ top: 0, behavior: "auto" });
      }
      ScrollTrigger.refresh();
    };

    const handleViewportResize = () => {
      window.cancelAnimationFrame(settleFrame);
      window.clearTimeout(settleTimer);

      settleFrame = window.requestAnimationFrame(settleViewport);
      settleTimer = window.setTimeout(settleViewport, 300);
    };

    window.addEventListener("resize", handleViewportResize);
    window.visualViewport?.addEventListener("resize", handleViewportResize);

    return () => {
      window.cancelAnimationFrame(settleFrame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", handleViewportResize);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
    };
  }, []);

  const onPointerMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div
      ref={rootRef}
      onMouseMove={onPointerMove}
      className={styles.home}
      style={
        {
          "--pointer-x": `${pointer.x}%`,
          "--pointer-y": `${pointer.y}%`,
        } as React.CSSProperties
      }
    >
      <div className={styles.pointerGlow} />

      <section data-hero className={styles.hero}>
        <ParticleBackground className={styles.heroParticles} contained />
        <div className={styles.heroGrid} />
        <div className={styles.heroCopy}>
          <div data-hero-kicker className={styles.eyebrow}>
            <span className={styles.liveDot} />
            Stellar · Soroban
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.lineMask}>
              <span data-hero-line className={styles.combinedTitleLine}>
                Let milestones <span className={styles.proveWord}>prove</span>
              </span>
            </span>
            <span className={styles.lineMask}>
              <span data-hero-line className={styles.themselvesWord}>
                themselves.
              </span>
            </span>
          </h1>

          <p data-hero-copy className={styles.heroBody}>
            AI verifies delivery, escrow pays in stages on Stellar, and every
            builder earns verified on-chain reputation - never all-or-nothing
            funding.
          </p>

          <div data-hero-actions className={styles.heroActions}>
            <MagneticLink href="/dashboard" primary>
              Start verifying <ArrowRight size={15} />
            </MagneticLink>
            <MagneticLink href="/grants">
              Browse grants <Orbit size={15} />
            </MagneticLink>
          </div>

          <div className={styles.heroMeta}>
            <span>01 / Evidence</span>
            <span>02 / Intelligence</span>
            <span>03 / Settlement</span>
          </div>
        </div>

        <div className={styles.orbitAnchor}>
          <div data-orbit-shell className={styles.orbitShell}>
            <div data-orb className={styles.orbStage}>
              <EquidoxOrb />
              <div className={`${styles.orbitLabel} ${styles.orbitLabelTop}`}>
                <span>AI confidence</span>
                <strong>VERIFIED</strong>
              </div>
              <div className={`${styles.orbitLabel} ${styles.orbitLabelBottom}`}>
                <span>Escrow state</span>
                <strong>LOCKED</strong>
              </div>
              <div className={styles.orbCore}>
                <Zap size={16} />
                <span>EQX</span>
              </div>
            </div>
          </div>
        </div>

        <a href="#experience" className={styles.scrollCue}>
          Scroll to verify <ArrowDown size={13} />
        </a>
      </section>

      <div className={styles.signalRail}>
        <div className={styles.signalTrack}>
          {[...SIGNALS, ...SIGNALS].map((signal, index) => (
            <span key={`${signal}-${index}`}>
              <Sparkles size={11} /> {signal}
            </span>
          ))}
        </div>
      </div>

      <section id="experience" className={styles.manifesto}>
        <div data-reveal className={styles.sectionAside}>
          <div className={styles.sectionIndex}>
            <span>01</span>
            <p>The trust problem</p>
          </div>
          <div className={styles.proofMatrix} aria-hidden="true">
            <div className={styles.matrixGrid} />
            <div className={styles.matrixFrame} />
            <div className={styles.matrixFrame} />
            <div className={styles.matrixFrame} />
            <div className={styles.matrixScan} />
            <div className={styles.matrixCore}>
              <ShieldCheck size={24} />
              <strong>PROOF</strong>
            </div>
            <span className={`${styles.matrixCorner} ${styles.matrixCornerTl}`}>
              01
            </span>
            <span className={`${styles.matrixCorner} ${styles.matrixCornerTr}`}>
              CLAIM
            </span>
            <span className={`${styles.matrixCorner} ${styles.matrixCornerBl}`}>
              HASH
            </span>
            <span className={`${styles.matrixCorner} ${styles.matrixCornerBr}`}>
              VALID
            </span>
          </div>
        </div>
        <div data-reveal className={styles.manifestoCopy}>
          <p className={styles.overline}>Why Equidox</p>
          <h2>
            Because blind grants shouldn&apos;t be{" "}
            <em>the default.</em>
          </h2>
          <p>
            We&apos;ve watched teams submit vaporware and get paid anyway.
            Equidox puts analysis, escrow, and reputation in one industrial
            loop - on Stellar.
          </p>
        </div>
      </section>

      <section className={styles.pillarsSection}>
        <div className={styles.pillarGrid}>
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article data-card key={pillar.number} className={styles.pillarCard}>
                <div className={styles.cardTopline}>
                  <span>{pillar.number}</span>
                  <Icon size={20} />
                </div>
                <div>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.body}</p>
                </div>
                <div className={styles.cardStat}>
                  <Activity size={12} />
                  {pillar.stat}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.protocolSection}>
        <div data-reveal className={styles.protocolIntro}>
          <div className={styles.sectionAside}>
            <div className={styles.sectionIndex}>
              <span>02</span>
              <p>The experience</p>
            </div>
            <div className={styles.flowDiagram} aria-hidden="true">
              <div className={styles.flowLine} />
              <div className={styles.flowPulse} />
              {["EVIDENCE", "AI HASH", "ESCROW"].map((label, index) => (
                <div key={label} className={styles.flowNode}>
                  <span>0{index + 1}</span>
                  <strong>{label}</strong>
                  <i />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className={styles.overline}>For builders and reviewers</p>
            <h2>We handle verification. You ship.</h2>
            <p className={styles.protocolDescription}>
              Whether you&apos;re delivering a milestone or reviewing one, every
              step stays inside the grant loop — escrow, AI hash, and on-chain
              release.
            </p>
          </div>
        </div>

        <div data-reveal className={styles.protocolConsole}>
          <div className={styles.consoleHeader}>
            <div className={styles.roleSwitch} role="tablist">
              {(["builder", "admin"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={role === item}
                  onClick={() => {
                    setRole(item);
                    setActiveStep(0);
                  }}
                  className={role === item ? styles.roleActive : ""}
                >
                  {item === "builder" ? "For the builder" : "For the admin"}
                </button>
              ))}
            </div>
            <span className={styles.consoleStatus}>
              <span /> Interactive protocol map
            </span>
          </div>

          <div className={styles.consoleBody}>
            <div className={styles.stepList}>
              {activeFlow.map((step, index) => {
                const Icon = step.icon;
                return (
                  <button
                    key={`${role}-${step.label}`}
                    type="button"
                    onFocus={() => setActiveStep(index)}
                    onClick={() => setActiveStep(index)}
                    className={activeStep === index ? styles.stepActive : ""}
                  >
                    <span className={styles.stepNumber}>0{index + 1}</span>
                    <Icon size={18} />
                    <span>{step.label}</span>
                    {activeStep === index && <ArrowRight size={14} />}
                  </button>
                );
              })}
            </div>

            <div key={`${role}-${activeStep}`} className={styles.stepDetail}>
              <div className={styles.stepPulse}>
                {(() => {
                  const Icon = activeFlow[activeStep].icon;
                  return <Icon size={32} />;
                })()}
              </div>
              <p>Step 0{activeStep + 1}</p>
              <h3>{activeFlow[activeStep].title}</h3>
              <span>{activeFlow[activeStep].body}</span>
              <div className={styles.progressDots}>
                {activeFlow.map((_, index) => (
                  <i
                    key={index}
                    className={index <= activeStep ? styles.dotComplete : ""}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.proofSection}>
        <div data-reveal className={styles.proofVisual}>
          <div className={styles.radar}>
            <div className={styles.radarSweep} />
            <div className={styles.radarCenter}>
              <Fingerprint size={34} />
              <strong>TRUST</strong>
              <span>ON-CHAIN</span>
            </div>
            {[0, 1, 2, 3].map((item) => (
              <span key={item} className={styles.radarPoint} />
            ))}
          </div>
        </div>
        <div data-reveal className={styles.proofCopy}>
          <div className={styles.sectionIndex}>
            <span>03</span>
            <p>The outcome</p>
          </div>
          <p className={styles.overline}>Reputation that compounds</p>
          <h2>Your work should outlive the grant.</h2>
          <p>
            Every paid milestone grows a verifiable Builder Passport—giving
            future funders a signal they can inspect instead of a claim they
            have to trust.
          </p>
          <ul>
            {[
              "Completed milestones",
              "Verified delivery history",
              "Total funds received",
              "Portable Stellar identity",
            ].map((item) => (
              <li key={item}>
                <Check size={13} /> {item}
              </li>
            ))}
          </ul>
          <Link href="/builders" className={styles.textLink}>
            Explore builder passports <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div data-reveal className={styles.faqHeading}>
          <p className={styles.overline}>Protocol notes</p>
          <h2>Quick answers before you start</h2>
        </div>
        <div data-reveal className={styles.faqList}>
          {FAQ.map((item, index) => {
            const open = openFaq === index;
            return (
              <article key={item.q} className={open ? styles.faqOpen : ""}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : index)}
                  aria-expanded={open}
                >
                  <span>0{index + 1}</span>
                  <strong>{item.q}</strong>
                  <ChevronDown size={17} />
                </button>
                <div className={styles.faqAnswer}>
                  <p>{item.a}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.ctaGrid} />
        <div data-reveal>
          <p className={styles.overline}>Testnet is live</p>
          <h2>
            Ready to let milestones pay,{" "}
            <span>safely</span>?
          </h2>
          <p>
            Testnet is live. Connect Freighter, deliver or review a milestone,
            and watch escrow move on-chain.
          </p>
          <div className={styles.heroActions}>
            <MagneticLink href="/dashboard" primary>
              Get started <Zap size={15} />
            </MagneticLink>
            <MagneticLink href="/submit">
              Submit evidence <ArrowRight size={15} />
            </MagneticLink>
          </div>
        </div>
      </section>
    </div>
  );
}
