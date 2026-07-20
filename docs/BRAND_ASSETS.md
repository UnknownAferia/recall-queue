# Vora Brand Assets

The canonical Vora artwork lives in the repository-level `assets` directory.
Runtime code must reference these files through `src/config/brand.ts` instead
of scattering file names or colors throughout the application.

## Asset roles

| File                      | Intended use                                     |
| ------------------------- | ------------------------------------------------ |
| `Vora.png`                | Discord application avatar and server icon       |
| `Vora_Banner.png`         | Main server, repository and welcome-panel banner |
| `Vora_Alpha_Banner.png`   | Private-alpha recruitment announcements          |
| `Vora_AD.png`             | External promotional artwork                     |
| `Vora_Icons.png`          | Brand and icon-system overview                   |
| `Vora_Single_Icons.png`   | Detailed icon reference sheet                    |
| `Vora_Design_Concept.png` | Internal brand guideline and design rationale    |

The two icon overview files are reference sheets, not individual Discord emoji
files. Individual transparent exports should be added separately before custom
emoji automation is implemented.

## Runtime behavior

Vora Community attaches `Vora_Banner.png` to the managed welcome panel and
references it from a Components V2 media gallery. The attachment is uploaded
only when the message does not already contain it; routine panel refreshes
reuse Discord's stored attachment.

If an optional asset is unavailable, publishing continues with the text-only
panel. This keeps server recovery and support functions usable in minimal
deployments.

## Palette

The palette defined in `src/config/brand.ts` is based on the design concept:

- Midnight `#081220`
- Slate `#182232`
- Vora Cyan `#1FC8FF`
- White `#F8FAFC`
- Emerald `#10B981`
- Amber `#F59E0B`
- Rose `#F43F5E`
- Purple `#8B5CF6`

Do not recolor, distort, rotate or add effects to the primary Vora mark.
