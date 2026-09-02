const categories = [
  "Crypto",
  "Sports",
  "Culture",
  "Technology",
  "Finance",
  "Politics",
  "Other",
];

export default function LaunchPage() {
  return (
    <main className="pageShell launchPage">
      <section className="launchIntro">
        <p className="eyebrow">Create the next rivalry</p>
        <h1>Launch a contest</h1>
        <p>
          Define two sides, choose a category, and open a permanent live market.
          Creation settles atomically on Robinhood Testnet.
        </p>
        <div className="launchFacts">
          <div><strong>5 Test USDC</strong><span>Creation fee</span></div>
          <div><strong>2 sides</strong><span>ERC-20 tokens</span></div>
          <div><strong>Market v1</strong><span>Immutable vault</span></div>
        </div>
      </section>

      <form className="launchForm">
        <div className="formHeader">
          <span>01</span>
          <div><p className="eyebrow">Contest setup</p><h2>Build the arena</h2></div>
        </div>

        <label className="field fieldWide">
          <span>Contest title</span>
          <input maxLength={120} name="title" placeholder="Who will command the live market?" required />
          <small>Frame one clear rivalry that people instantly understand.</small>
        </label>

        <div className="fieldGrid">
          <label className="field fieldSideA">
            <span>Side A</span>
            <input maxLength={40} name="sideA" placeholder="Side A name" required />
          </label>
          <label className="field fieldSideB">
            <span>Side B</span>
            <input maxLength={40} name="sideB" placeholder="Side B name" required />
          </label>
        </div>

        <label className="field fieldWide">
          <span>Category</span>
          <select defaultValue="" name="category" required>
            <option disabled value="">Select a category</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
          <small>Category powers discovery and filtering across All markets.</small>
        </label>

        <label className="field fieldWide">
          <span>Description</span>
          <textarea maxLength={800} name="description" placeholder="Explain the rivalry, context, and what each side represents." rows={5} required />
        </label>

        <label className="field fieldWide">
          <span>Cover image URL</span>
          <input name="image" placeholder="https://…" type="url" />
        </label>

        <div className="launchSummary">
          <div><span>Network</span><strong>Robinhood Testnet</strong></div>
          <div><span>Creation fee</span><strong>5 Test USDC</strong></div>
          <div><span>Market curve</span><strong>b = 270K</strong></div>
        </div>

        <button className="button launchSubmit" disabled type="button">
          Connect wallet to launch
        </button>
        <p className="formFootnote">Metadata and contract-write integration will be enabled after validation.</p>
      </form>
    </main>
  );
}
