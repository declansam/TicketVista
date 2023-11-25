/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.hbs"],
  theme: {
    extend: {
      
      colors: {

        primary: {
          
          100: "#435585",
          200: "#3c4f7c",
          300: "#364874",
          400: "#2f426b",
          500: "#283862",
          600: "#223059",
          700: "#1b274f",

        },

        secondary: {
            
            100: "#e6e6e6",
            200: "#cccccc",
            300: "#b3b3b3",
            400: "#999999",
            500: "#808080",
            600: "#666666",
            700: "#4d4d4d",

        },
        
        tert: {
            
            100: "#C5DFF8",
            200: "#A9CFF1",
            300: "#8EBEEA",
            400: "#72AEE3",
            500: "#579EDC",
            600: "#4680A2",
            700: "#356275",
            800: "#244448",

        }

      },

      fontFamily: {
        
        body: ["Poppins", "sans-serif"],
        heading: ["Ubuntu", "Times New Roman", "serif"],
        button: ["Times New Roman", "sans-serif"],

      },

    },
  },
  
  plugins: [],

}

