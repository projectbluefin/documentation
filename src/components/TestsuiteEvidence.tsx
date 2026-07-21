import "./testsuite-evidence.css";

export default function TestsuiteEvidence() {
  return (
    <section className="testsuite-evidence" aria-label="Testsuite verification evidence">
      <div className="testsuite-evidence__runs">
        <a className="testsuite-evidence__run testsuite-evidence__run--success" href="https://projectbluefin.github.io/testsuite/run/run-success/" target="_blank" rel="noopener noreferrer">
          <img src="/img/blog/2026-07-22-seven-days-to-the-wolves/testsuite-run-success.png" alt="Successful Testsuite verification run with four passing assertions" loading="lazy" />
          <span>Successful run · 4 / 0 / 4</span>
        </a>
        <a className="testsuite-evidence__run testsuite-evidence__run--failure" href="https://projectbluefin.github.io/testsuite/run/run-failed/" target="_blank" rel="noopener noreferrer">
          <img src="/img/blog/2026-07-22-seven-days-to-the-wolves/testsuite-run-failed.png" alt="Failed Testsuite verification run with one failed assertion" loading="lazy" />
          <span>Failed run · 3 / 1 / 4</span>
        </a>
      </div>
    </section>
  );
}
