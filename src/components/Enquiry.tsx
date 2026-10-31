import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { JourneyMode } from '../journey/timeline';

/** Supply real routes when merging; the standalone edition prepares a downloadable brief. */
export type EnquiryLinks = { quoteHref?: string; contactHref?: string };
export function Enquiry({ mode, links = {} }: { mode: JourneyMode; links?: EnquiryLinks }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [intent, setIntent] = useState('quote');
  const [saved, setSaved] = useState(false);
  function open(kind: string) { setIntent(kind); setSaved(false); dialog.current?.showModal(); }
  function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const text = [
      'VESTANO — IMPORT & EXPORT ENQUIRY', '',
      `Request: ${intent === 'quote' ? 'Import / Export Quote' : 'Contact Vestano'}`,
      ...Array.from(data.entries(), ([key, value]) => `${key}: ${value}`),
      '', 'Prepared locally. This enquiry has not been sent to Vestano.',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'vestano-enquiry.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setSaved(true);
  }
  return <>
    <div className="cta-actions">
      {links.quoteHref ? <a className="button button-light" href={links.quoteHref}>Request Import / Export Quote <span>↗</span></a> : <button className="button button-light" onClick={() => open('quote')}>Request Import / Export Quote <span>↗</span></button>}
      {links.contactHref ? <a className="button button-outline" href={links.contactHref}>Contact Vestano <span>↗</span></a> : <button className="button button-outline" onClick={() => open('contact')}>Contact Vestano <span>↗</span></button>}
    </div>
    <dialog className="enquiry-dialog" aria-labelledby="enquiry-title" ref={dialog} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
      <button className="dialog-close" aria-label="Close enquiry" onClick={() => dialog.current?.close()}>×</button>
      <p className="eyebrow">LET’S START A CONVERSATION</p>
      <h2 id="enquiry-title">{intent === 'quote' ? 'Your next shipment.' : 'Connect with Vestano.'}</h2>
      <p>Prepare a shipment brief to share with Vestano. Save a copy to your device with your sourcing, shipping and delivery requirements. No information is sent from this form.</p>
      <form onSubmit={download}>
        <div className="form-row"><label>Your name<input name="Name" autoComplete="name" required maxLength={120} /></label><label>Email address<input name="Email" type="email" autoComplete="email" required maxLength={254} /></label></div>
        <div className="form-row"><label>Journey<select name="Journey" defaultValue={mode}><option value="import">Import to Kerala</option><option value="export">Export from Kerala</option></select></label><label>Company<input name="Company" autoComplete="organization" maxLength={180} /></label></div>
        <label>Tell us about your consignment<textarea name="Consignment" rows={3} placeholder="Rack type, quantity, China origin and Kerala delivery location" required maxLength={2500} /></label>
        <button className="button button-dark" type="submit">Save enquiry brief <span>↓</span></button>
        <p className="form-status" role="status">{saved ? 'Your enquiry brief has been saved. No information has been submitted.' : 'Your information stays on this device.'}</p>
      </form>
    </dialog>
  </>;
}
