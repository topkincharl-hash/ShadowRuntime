/** @type {import('tailwindcss').Config} */

export default {
  darkMode: ["class"],

  content: [
    "./index.html",

    "./src/**/*.{js,ts,jsx,tsx}",

    "./components/**/*.{js,ts,jsx,tsx}",

    "./app/**/*.{js,ts,jsx,tsx}"
  ],

  theme: {
    extend: {
      colors: {
        queen: {
          black: "#07070a",

          void: "#0f0b1a",

          shadow: "#15131d",

          velvet: "#1b1325",

          violet: "#6d28d9",

          purple: "#9333ea",

          lavender: "#c084fc",

          moon: "#d6d6e7",

          gold: "#d4af37",

          royalgold: "#f4c542",

          mist: "rgba(255,255,255,0.05)",

          glass: "rgba(255,255,255,0.08)",

          border: "rgba(255,255,255,0.12)"
        }
      },

      fontFamily: {
        display: [
          "Cinzel",
          "serif"
        ],

        body: [
          "Inter",
          "sans-serif"
        ]
      },

      backgroundImage: {
        "queen-main":
          "linear-gradient(180deg, #07070a 0%, #0f0b1a 50%, #07070a 100%)",

        "queen-violet":
          "radial-gradient(circle at top, rgba(109,40,217,0.22), transparent 45%)",

        "queen-gold":
          "radial-gradient(circle at bottom, rgba(212,175,55,0.10), transparent 35%)",

        "velvet-glow":
          "linear-gradient(135deg, rgba(109,40,217,0.35), rgba(212,175,55,0.08))",

        "glass-panel":
          "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))"
      },

      boxShadow: {
        queen:
          "0 0 40px rgba(109,40,217,0.35)",

        gold:
          "0 0 30px rgba(212,175,55,0.22)",

        velvet:
          "0 20px 60px rgba(0,0,0,0.45)",

        throne:
          "0 0 80px rgba(109,40,217,0.28)"
      },

      backdropBlur: {
        xs: "2px"
      },

      borderRadius: {
        queen: "28px",

        throne: "36px"
      },

      keyframes: {
        ambientPulse: {
          "0%, 100%": {
            opacity: "0.45"
          },

          "50%": {
            opacity: "0.9"
          }
        },

        mistFlow: {
          "0%": {
            transform: "translateX(-5%)"
          },

          "50%": {
            transform: "translateX(5%)"
          },

          "100%": {
            transform: "translateX(-5%)"
          }
        },

        glowPulse: {
          "0%, 100%": {
            boxShadow:
              "0 0 25px rgba(109,40,217,0.22)"
          },

          "50%": {
            boxShadow:
              "0 0 60px rgba(109,40,217,0.48)"
          }
        },

        floatSlow: {
          "0%, 100%": {
            transform: "translateY(0px)"
          },

          "50%": {
            transform: "translateY(-8px)"
          }
        },

        shimmer: {
          "0%": {
            backgroundPosition: "-200% center"
          },

          "100%": {
            backgroundPosition: "200% center"
          }
        }
      },

      animation: {
        ambient: "ambientPulse 8s ease-in-out infinite",

        mist: "mistFlow 14s ease-in-out infinite",

        glow: "glowPulse 4s ease-in-out infinite",

        float: "floatSlow 7s ease-in-out infinite",

        shimmer: "shimmer 5s linear infinite"
      },

      transitionTimingFunction: {
        sovereign: "cubic-bezier(0.22, 1, 0.36, 1)"
      },

      screens: {
        xs: "420px"
      }
    }
  },

  plugins: [
    require("@tailwindcss/typography"),

    require("@tailwindcss/forms"),

    require("@tailwindcss/aspect-ratio")
  ]
}