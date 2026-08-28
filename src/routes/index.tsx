import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import dessertParfait from "../assets/dessert-parfait.jpg.asset.json";
import pastaBowl from "../assets/pasta-bowl.jpg.asset.json";
import restaurantInterior from "../assets/restaurant-interior.jpg.asset.json";
import { Logo } from "../components/Logo";




export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Klown — Scan, split and pay your restaurant bill" },
      {
        name: "description",
        content:
          "Scan the Klown code at your table, split the bill your way, pay with Mobile Money or card and earn Klown Points.",
      },
      { property: "og:title", content: "Klown — Scan, split and pay your restaurant bill" },
      {
        property: "og:description",
        content:
          "Scan the Klown code at your table, split the bill your way, pay with Mobile Money or card and earn Klown Points.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const restaurants = [
  "KOZO",
  "AYA",
  "BISTRO 22",
  "SKYBAR 25",
  "SAINT PABLO",
  "MORE RESTAURANTS COMING SOON",
];

const offers = [
  {
    name: "Earn from your first Klown payment",
    tag: "WELCOME TO Klown",
    cta: "JOIN Klown ↗",
    image: restaurantInterior.url,
    href: "#signup",
  },

  {
    name: "Split the bill without the stress",
    tag: "Klown PAY",
    cta: "SEE HOW IT WORKS ↗",
    image: dessertParfait.url,
    href: "#how",
  },

  {
    name: "Come back to more",
    tag: "Klown REWARDS",
    cta: "EXPLORE REWARDS ↗",
    image: pastaBowl.url,
    href: "#club",
  },
];


const tiers = [
  {
    name: "Member",
    number: "01",
    label: "START HERE",
    heading: "Earn from your first Klown payment",
    description:
      "Join Klown and start earning points whenever you pay at a participating restaurant.",
    benefits: [
      "Earn Klown Points",
      "Keep your digital receipts in one place",
      "Receive member-only restaurant offers",
    ],
  },
  {
    name: "Regular",
    number: "02",
    label: "RETURN & MOVE UP",
    heading: "More recognition as you return",
    description:
      "Move up when you dine with Klown more often and unlock better rewards across the network.",
    benefits: [
      "Everything included with Member",
      "Faster Klown Points earning",
      "Early access to selected offers",
    ],
  },
  {
    name: "Inner Circle",
    number: "03",
    label: "TOP MEMBER STATUS",
    heading: "The best of Klown",
    description: "Klown’s highest membership tier recognises the diners who return most often.",
    benefits: [
      "Everything included with Regular",
      "Klown’s highest points earning rate",
      "Priority access and special dining experiences",
    ],
  },
];

const journal: [string, string][] = [
  [
    "Why Klown is rethinking the restaurant checkout",
    "A faster, simpler way to view, split and pay the bill from your phone.",
  ],
  [
    "Why Mobile Money belongs at the table",
    "Designing restaurant payments around the way people already pay.",
  ],
  [
    "Loyalty should feel better than a plastic card",
    "How Klown turns repeat dining into recognition and useful rewards.",
  ],
];

function Index() {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const targets = document.querySelectorAll(".reveal, .feature-row, .press span");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      {submitted && (
        <div className="signup-success" role="status" aria-live="polite">
          <div className="signup-success-card">
            <button
              type="button"
              className="signup-success-close"
              aria-label="Close confirmation"
              onClick={() => setSubmitted(false)}
            >
              ×
            </button>
            <p className="eyebrow">WELCOME TO Klown</p>
            <h2>You’re on the list.</h2>
            <p>We’ll keep you posted with the good stuff.</p>
            <button type="button" className="pill" onClick={() => setSubmitted(false)}>
              Done <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      )}

      <section className="hero" id="join">
        <nav className="nav">
          <Logo />
          <div className="nav-links">
            <a href="#how">How It Works</a>
            <a href="#club">Rewards</a>
            <a href="#restaurants">Restaurants</a>
            <a className="pill pill-light" href="#signup">
              Join Klown<span aria-hidden="true">↗</span>
            </a>
          </div>
          <button className="menu" aria-label="Open menu">
            ☰
          </button>
        </nav>
        <div className="hero-content">
          <p className="hero-copy">
            Scan the Klown code at your table. View your bill, split it your way, add a tip and pay
            with Mobile Money or card. Then earn Klown Points for coming back.
          </p>
          <a className="pill pill-light" href="#how">
            See how Klown works<span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section className="featured reveal">
        <p className="eyebrow">A BETTER WAY TO DINE</p>
        <h2>
          Making the table
          <br />
          <em>feel closer.</em>
        </h2>
        <p className="feature-copy">
          Klown removes the wait at the end of a meal. See your live bill, split it fairly, tip your
          way, pay securely and keep a digital receipt—without waiting for the card machine.
        </p>
        <div
          className="press ghana-restaurants"
          aria-label="Featured restaurants in the Klown collection"
        >
          <img src="/kozo-logo.png" alt="Kozo logo" />
          <img src="/aya-logo.png" alt="AYA Restaurant logo" />
          <img src="/bella-logo.png" alt="Bella Africa logo" />
          <img src="/skybar-logo.png" alt="SkyBar 25 logo" />
          <img src="/saint-pablo-logo.png" alt="Saint Pablo logo" />
        </div>
      </section>

      <section className="how" id="how" aria-label="How Klown works">
        <h2 className="how-title">How Klown works</h2>
        <article className="feature-row">
          <div className="feature-copy-block">
            <h2>
              Scan once.
              <br />
              <em>Your table is ready.</em>
            </h2>
            <p>
              Scan the Klown QR code at your table to connect instantly. Follow your itemised bill
              as the restaurant adds your order, then return whenever you’re ready to pay.
            </p>
          </div>
          <div className="feature-art cards-art">
            <img
              className="cards-photo"
              src="/klown-cards.png"
              alt="Klown membership tier cards"
            />
          </div>
        </article>
        <article className="feature-row feature-row-reverse">
          <div className="feature-copy-block">
            <h2>
              See the bill.
              <br />
              <em>Split without the maths.</em>
            </h2>
            <p>
              Pay the full bill, split evenly, enter a custom amount or invite others at the table to
              pay their share. Add a tip and check out with Mobile Money, card or Klown Points.
            </p>
          </div>
          <div className="feature-art device-art">
            <img className="pay-photo" src="/klown-pay.png" alt="Klown Pay mobile checkout screen" />
          </div>
        </article>
      </section>

      <section className="club" id="club">
        <div className="club-intro">
          <p className="eyebrow">Klown REWARDS</p>
          <h2>Good meals should give you a reason to return.</h2>
          <div className="club-mark">
            Klown
            <br />
            <em>CLUB</em>
          </div>
        </div>
        <div className="tiers">
          {tiers.map((t) => (
            <article className="tier" key={t.name}>
              <div className="tier-top">
                <span>{t.name}</span>
                <b>{t.number}</b>
              </div>
              <div className="tier-card">
                Klown
                <br />
                <em>{t.name}</em>
                <strong>{t.number}</strong>
              </div>
              <p className="tier-label">{t.label}</p>
              <h3>{t.heading}</h3>
              <p>{t.description}</p>
              <ul>
                {t.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <a className="pill" href="#signup">
                Join Klown<span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="restaurants" id="restaurants">
        <div className="restaurant-copy">
          <p className="eyebrow">DISCOVER WITH Klown</p>
          <h2>Restaurants</h2>
          <p>
            Discover restaurants where Klown makes paying easier and coming back more rewarding.
            We’re starting in Accra and adding new tables as our partner network grows.
          </p>
          <div className="tabs">
            <button className="active">ACCRA</button>
          </div>
        </div>
        <div className="restaurant-list">
          {restaurants.map((r, i) => (
            <div className="restaurant-row" key={r}>
              <span>0{i + 1}</span>
              <strong>{r}</strong>
              <small>COMING SOON</small>
            </div>
          ))}
        </div>
      </section>

      <section className="expanding">
        <p className="eyebrow">WE’RE EXPANDING!</p>
        <h2>
          Accra first.
          <br />
          <em>More tables next.</em>
        </h2>
        <p>
          We’re launching Klown with a growing collection of restaurants in Accra, then expanding
          city by city. Want Klown at your favourite restaurant? Tell us where to go next.
        </p>
        <a className="pill" href="#signup">
          Bring Klown to a restaurant<span aria-hidden="true">↗</span>
        </a>
      </section>

      <section className="offers">
        <div className="offers-heading">
          <p className="eyebrow">MEMBER BENEFITS</p>
          <h2>
            Good things
            <br />
            <em>come to those</em>
            <br />
            who dine.
          </h2>
        </div>
        <div className="offer-grid">
          {offers.map((o) => (
            <a href={o.href} className="offer" key={o.name}>
              <img src={o.image} alt={o.name} />
              <div>
                <span>{o.tag}</span>
                <h3>{o.name}</h3>
                <b>{o.cta}</b>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="fly" id="points">
        <p className="eyebrow">Klown POINTS</p>
        <h2>
          Rewards that follow
          <br />
          <em>your good taste.</em>
        </h2>
        <p>
          Earn Klown Points whenever you pay at a participating restaurant. Track your balance, move
          through Klown Club tiers and use eligible points toward future dining across the Klown
          network.
        </p>
        <a className="pill" href="#club">
          Explore Klown Rewards<span aria-hidden="true">↗</span>
        </a>
      </section>

      <section className="journal" id="journal">
        <p className="eyebrow">THE Klown JOURNAL</p>
        <h2>
          Stories about restaurants, culture, technology and the future of dining in Africa.
        </h2>
        <div className="journal-grid">
          {journal.map(([title, desc]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{desc}</p>
              <small>COMING SOON</small>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <div className="footer-top">
          <Logo dark />
          <p>
            Good
            <br />
            <em>taste</em>
            <br />
            gets rewarded.
          </p>
          <form
            id="signup"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <label htmlFor="email">{submitted ? "You’re on the list." : "Get Klown updates."}</label>
            <div>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Your email address"
                required
              />
              <button type="submit">JOIN ↗</button>
            </div>
          </form>
        </div>
        <div className="footer-links">
          <div>
            <b>FOR DINERS</b>
            <a href="#how">HOW IT WORKS</a>
            <a href="#how">Klown PAY</a>
            <a href="#club">Klown REWARDS</a>
            <a href="#restaurants">RESTAURANTS</a>
            <a href="#signup">FAQS</a>
          </div>
          <div>
            <b>FOR RESTAURANTS</b>
            <a href="#signup">BECOME A PARTNER</a>
            <a href="#signup">REQUEST A DEMO</a>
          </div>
          <div>
            <b>ABOUT Klown</b>
            <a href="#join">ABOUT US</a>
            <a href="#journal">JOURNAL</a>
            <a href="#signup">CAREERS</a>
            <a href="#signup">CONTACT US</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Klown. ALL RIGHTS RESERVED.</span>
          <span>
            <a href="#join">PRIVACY POLICY</a> <a href="#join">TERMS OF SERVICE</a>{" "}
            <a href="/admin">STAFF ACCESS</a>
          </span>
        </div>
      </footer>
    </main>
  );
}
