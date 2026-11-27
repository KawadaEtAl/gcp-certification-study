#!/usr/bin/env python3
"""Import reviewed PCA card sources into the local Anki collection."""

import argparse
from collections import Counter
from html import escape
import json
from pathlib import Path
import re
import sys
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = "http://127.0.0.1:8765"
MODEL = "GCP-PCA-Card"
TEMPLATE = "PCA"
FIELDS = {
    "CardID": "id",
    "Category": "category",
    "Topic": "topic",
    "Question": "question",
    "Answer": "answer",
    "Reason": "reason",
    "FlipPoint": "flip_point",
    "SourceRef": "source_ref",
    "DiagramSVG": "diagram_svg",
}
CATEGORIES = {
    "設計即断": "decision",
    "条件反転": "flip",
    "切り分け": "triage",
    "ひっかけ": "trap",
}
MANAGED_TAG_PREFIXES = ("gcp::", "week::", "domain::", "type::")
SVG_ELEMENTS = {
    "svg": {"viewBox", "width", "height", "role", "aria-label"},
    "rect": {"class", "x", "y", "width", "height", "rx"},
    "text": {"class", "x", "y"},
    "path": {"class", "d"},
}

FRONT = """<main class="pca">
<header><span class="category">{{Category}}</span><span class="topic">{{Topic}}</span></header>
<div class="question">{{Question}}</div>
</main>"""
BACK = """<main class="pca">
<header><span class="category">{{Category}}</span><span class="topic">{{Topic}}</span></header>
<div class="answer">{{Answer}}</div>
<div class="reason">{{Reason}}</div>
{{#DiagramSVG}}<figure class="diagram">{{DiagramSVG}}</figure>{{/DiagramSVG}}
{{#FlipPoint}}<aside>{{FlipPoint}}</aside>{{/FlipPoint}}
<div class="question repeated">{{Question}}</div>
<div class="reference">{{SourceRef}}</div>
</main>"""
CSS = """.card {
    --diagram-surface: #eff6fd; --diagram-outline: #6684a4;
    --diagram-label: #182230; --diagram-edge: #31567d;
    margin: 0; background: #fff; color: #182230;
    font: 18px/1.6 -apple-system, BlinkMacSystemFont, sans-serif;
}
.pca { max-width: 38rem; margin: 0 auto; padding: 1rem; text-align: left; }
.pca header { display: flex; flex-wrap: wrap; gap: .4rem .65rem; align-items: center; }
.pca .category {
    padding: .05rem .6rem; border-radius: .7rem;
    background: #dbeafe; color: #173f85; font-weight: 700;
}
.pca header, .pca .reference { font-size: .8rem; }
.pca .topic, .pca .reference, .pca .repeated { color: #4a5869; }
.pca .question, .pca .answer { margin-top: 1rem; font-weight: 700; overflow-wrap: anywhere; }
.pca .answer { font-size: 1.25em; color: #173f85; }
.pca .reason, .pca aside { margin-top: .65rem; }
.pca aside { border-left: .2rem solid #6181ac; padding-left: .65rem; }
.pca .repeated { border-top: 1px solid #9caab9; padding-top: .7rem; font-size: .85em; font-weight: 400; }
.pca .reference { margin-top: .45rem; overflow-wrap: anywhere; }
.pca .diagram { margin: .9rem 0; }
.pca .diagram svg { display: block; width: 100%; max-width: 25rem; height: auto; }
.pca .diagram .pca-node { fill: var(--diagram-surface); stroke: var(--diagram-outline); }
.pca .diagram .pca-label, .pca .diagram .pca-edge { text-anchor: middle; }
.pca .diagram .pca-label { fill: var(--diagram-label); font-size: 17px; font-weight: 650; }
.pca .diagram .pca-edge { fill: var(--diagram-edge); font-size: 16px; }
.pca .diagram .pca-flow { fill: none; stroke: var(--diagram-edge); stroke-width: 2; }
.card.nightMode, .nightMode .card {
    background: #141922; color: #edf2f9;
    --diagram-surface: #263750; --diagram-outline: #7396bf;
    --diagram-label: #edf2f9; --diagram-edge: #b3d3fc;
}
.nightMode .pca .category { background: #294772; color: #eff6ff; }
.nightMode .pca .answer { color: #a9cdff; }
.nightMode .pca .topic, .nightMode .pca .reference, .nightMode .pca .repeated { color: #bac8da; }
@media (prefers-reduced-motion: no-preference) {
    .pca .diagram .pca-flow { animation: pca-reveal-flow 650ms ease-out 1; }
    @keyframes pca-reveal-flow { from { opacity: .3; } to { opacity: 1; } }
}
"""


def anki(action, **params):
    payload = json.dumps({"action": action, "version": 6, "params": params}).encode("utf-8")
    request = Request(ENDPOINT, data=payload, headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=30) as response:
        reply = json.load(response)
    if reply["error"] is not None:
        raise RuntimeError(f"{action}: {reply['error']}")
    return reply["result"]


def load_cards(cards_dir):
    paths = sorted(cards_dir.glob("*.json"))
    if not paths:
        raise ValueError(f"No JSON files found in {cards_dir}")
    cards = {}
    required = set(FIELDS.values()) - {"flip_point", "diagram_svg"}
    for path in paths:
        entries = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(entries, list) or not entries:
            raise ValueError(f"{path}: expected a nonempty JSON array")
        for index, card in enumerate(entries, start=1):
            where = f"{path}, card {index}"
            if not isinstance(card, dict) or any(
                not isinstance(card.get(key), str) or not card[key].strip() for key in required
            ):
                raise ValueError(f"{where}: missing or empty required text field")
            if not isinstance(card.get("flip_point", ""), str):
                raise ValueError(f"{where}: flip_point must be text")
            diagram = card.get("diagram_svg", "")
            if not isinstance(diagram, str):
                raise ValueError(f"{where}: diagram_svg must be text")
            if diagram:
                validate_diagram(diagram, where)
            card_id = card["id"]
            if not re.fullmatch(r"pca-w[0-9]{2}-[0-9]{3}", card_id) or card_id in cards:
                raise ValueError(f"{where}: invalid or duplicate card ID {card_id!r}")
            card_type = CATEGORIES.get(card["category"])
            tags = card.get("tags")
            if not card_type or not isinstance(tags, list) or any(
                not isinstance(tag, str) or not re.fullmatch(r"[a-z0-9:-]+", tag) for tag in tags
            ):
                raise ValueError(f"{where}: invalid category or tag")
            expected = {"gcp::pca", f"week::{card_id.split('-')[1]}", f"type::{card_type}"}
            if not expected.issubset(tags) or not any(tag.startswith("domain::") for tag in tags):
                raise ValueError(f"{where}: missing required tags")
            cards[card_id] = card
    return cards


def validate_diagram(diagram, where):
    if "<!" in diagram or "<?" in diagram:
        raise ValueError(f"{where}: SVG must contain drawing elements only")
    namespace = "{http://www.w3.org/2000/svg}"
    try:
        root = ElementTree.fromstring(diagram)
    except ElementTree.ParseError as exc:
        raise ValueError(f"{where}: invalid SVG: {exc}") from exc
    if root.tag != f"{namespace}svg" or not root.get("aria-label"):
        raise ValueError(f"{where}: expected an SVG with an accessible label")
    for element in root.iter():
        allowed = SVG_ELEMENTS.get(element.tag.removeprefix(namespace))
        if allowed is None or not element.tag.startswith(namespace) or set(element.attrib) - allowed:
            raise ValueError(f"{where}: unsupported SVG element or attribute")


def ensure_model():
    if MODEL not in anki("modelNames"):
        anki(
            "createModel", modelName=MODEL, inOrderFields=list(FIELDS), css=CSS,
            isCloze=False,
            cardTemplates=[{"Name": TEMPLATE, "Front": FRONT, "Back": BACK}],
        )
        return
    templates = anki("modelTemplates", modelName=MODEL)
    fields = anki("modelFieldNames", modelName=MODEL)
    desired_fields = list(FIELDS)
    if fields not in (desired_fields, desired_fields[:-1]) or set(templates) != {TEMPLATE}:
        raise ValueError(f"{MODEL} exists with a different field or template layout")
    if fields == desired_fields[:-1]:
        anki("modelFieldAdd", modelName=MODEL, fieldName="DiagramSVG")
    desired = {"Front": FRONT, "Back": BACK}
    if templates[TEMPLATE] != desired:
        anki("updateModelTemplates", model={"name": MODEL, "templates": {TEMPLATE: desired}})
    if anki("modelStyling", modelName=MODEL)["css"] != CSS:
        anki("updateModelStyling", model={"name": MODEL, "css": CSS})


def existing_notes():
    notes = {}
    ids = anki("findNotes", query=f'note:"{MODEL}"')
    for note in anki("notesInfo", notes=ids) if ids else []:
        card_id = note["fields"]["CardID"]["value"]
        if card_id in notes:
            raise ValueError(f"Anki contains duplicate CardID {card_id!r}")
        notes[card_id] = note
    return notes


def sync(cards, deck):
    ensure_model()
    existing = existing_notes()
    if deck not in anki("deckNames"):
        anki("createDeck", deck=deck)
    counts = Counter()
    for card_id, card in cards.items():
        fields = {
            field: escape(card.get(key, ""), quote=False).replace("\n", "<br>")
            for field, key in FIELDS.items() if field != "DiagramSVG"
        }
        fields["DiagramSVG"] = card.get("diagram_svg", "")
        tags = set(card["tags"])
        note = existing.get(card_id)
        if note is None:
            anki("addNote", note={
                "deckName": deck, "modelName": MODEL, "fields": fields, "tags": sorted(tags),
            })
            counts["added"] += 1
            continue
        counts["matched"] += 1
        note_id = note["noteId"]
        current_tags = set(note["tags"])
        remove = {tag for tag in current_tags - tags if tag.startswith(MANAGED_TAG_PREFIXES)}
        add = tags - current_tags
        changed = any(fields[field] != note["fields"][field]["value"] for field in fields)
        if changed:
            anki("updateNoteFields", note={"id": note_id, "fields": fields})
        if remove:
            anki("removeTags", notes=[note_id], tags=" ".join(sorted(remove)))
        if add:
            anki("addTags", notes=[note_id], tags=" ".join(sorted(add)))
        counts["updated"] += bool(changed or remove or add)
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--deck", default="GCP::PCA", help="destination for new notes")
    parser.add_argument("--cards-dir", type=Path, default=ROOT / "anki/cards")
    parser.add_argument("--dry-run", action="store_true", help="validate sources without contacting Anki")
    parser.add_argument("--ankiweb-sync", action="store_true", help="sync AnkiWeb after importing")
    args = parser.parse_args()
    if args.dry_run and args.ankiweb_sync:
        parser.error("--ankiweb-sync cannot be combined with --dry-run")
    if not args.deck.strip():
        parser.error("--deck cannot be empty")
    try:
        cards = load_cards(args.cards_dir)
        if args.dry_run:
            print(f"Dry run: {len(cards)} cards validated for {args.deck}.")
            for card in cards.values():
                print(f"  {card['id']}  {card['category']}  {card['topic']}")
            return 0
        counts = sync(cards, args.deck)
        print(f"{args.deck}: {counts['added']} added, {counts['matched']} matched, {counts['updated']} updated.")
        if args.ankiweb_sync:
            anki("sync")
            print("AnkiWeb sync completed.")
        return 0
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"Anki import stopped: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
