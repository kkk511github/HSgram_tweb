const cryptoRef = typeof(window) !== 'undefined' && 'crypto' in window ? window.crypto : self.crypto;
const subtle = cryptoRef?.subtle;

export default subtle;
