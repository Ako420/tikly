const color = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: color('background'),
        surface: color('surface'),
        'surface-raised': color('surface-raised'),
        border: color('border'),
        'border-subtle': color('border-subtle'),
        outline: color('outline'),
        foreground: color('foreground'),
        'foreground-secondary': color('foreground-secondary'),
        'foreground-muted': color('foreground-muted'),
        accent: color('accent'),
        'on-accent': color('on-accent'),
        'accent-text': color('accent-text'),
        primary: color('primary'),
        'on-primary': color('on-primary'),
        action: color('action'),
        'on-action': color('on-action'),
        media: color('media'),
        'on-media': color('on-media'),
        valid: color('valid'),
        warning: color('warning'),
        invalid: color('invalid'),
        mtn: '#ffcb05',
        'orange-money': '#ff7900',
      },
      borderRadius: {
        'logo-sm': '10px',
        card: '18px',
        'logo-lg': '28px',
      },
    },
  },
  plugins: [],
};
