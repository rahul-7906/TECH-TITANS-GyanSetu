// Brand colours and font. Change them here and the whole page updates.
tailwind.config = {
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#0B1F17',      // very dark green (buttons, dark banners)
        forest: '#064E3B',   // deep green
        leaf: '#2F6F11',     // mid green (arrow circles, small labels)
        lime: { brand: '#B9F044' },
        mist: '#F4FBEA'      // very light green tint for cards
      },
      boxShadow: {
        soft: '0 12px 40px -14px rgba(11, 31, 23, 0.18)',
        card: '0 6px 24px -10px rgba(11, 31, 23, 0.14)',
        glow: '0 0 70px 8px rgba(185, 240, 68, 0.30)'
      }
    }
  }
}
