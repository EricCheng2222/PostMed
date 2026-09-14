#!/usr/bin/env python3
"""Generate matching visual lesson embeds and the standalone Visual Lab."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]

def slider(key, label, minimum, maximum, step, value, unit=''):
    return f'<label class="viz-control"><span>{label}<output data-value="{key}">{value} {unit}</output></span><input type="range" data-control="{key}" aria-label="{label}" min="{minimum}" max="{maximum}" step="{step}" value="{value}" data-unit="{unit}"></label>'

def select(key, label, options):
    return f'<label class="viz-control"><span>{label}</span><select data-control="{key}">' + ''.join(f'<option value="{value}">{text}</option>' for value, text in options) + '</select></label>'

def stats(labels):
    return '<div class="viz-stats">' + ''.join(f'<div class="viz-stat"><span>{label}</span><strong data-stat="{key}">—</strong></div>' for key, label in labels) + '</div>'

def graph(name, height=230):
    return f'<svg class="viz-graph" data-graph="{name}" viewBox="0 0 440 {height}" role="img" aria-label="{name}"></svg>'

LABS = [
 dict(key='motion', subject='Physics', title='One motion. Three connected graphs.', intro='Change the starting velocity and acceleration. Scrub time to connect position, velocity and the area under the curve.',
  page='physics-01-kinematics.html',
  controls=slider('v0','Initial velocity',-8,8,1,4,'m/s')+slider('a','Acceleration',-3,3,.5,-1,'m/s²')+slider('t','Time',0,6,.1,4,'s')+'<fieldset><legend>Try a motion</legend><div class="viz-presets"><button type="button" data-preset="turn">Turn around</button><button type="button" data-preset="steady">Steady speed</button><button type="button" data-preset="rest">Start from rest</button></div></fieldset>',
  stage='<div class="viz-motion-graphs">'+''.join(f'<div><div class="viz-diagram-heading"><b>{title}</b><span>{hint}</span></div>{graph(key,160)}</div>' for key,title,hint in [('position','Position x (m)','slope = velocity'),('velocity','Velocity v (m/s)','signed area = displacement'),('acceleration','Acceleration a (m/s²)','slope of velocity')])+'</div><div class="viz-legend"><span><i></i>Positive area</span><span><i class="legend-b"></i>Negative area</span><span>Time (s) · scales stay fixed while scrubbing</span></div>'+stats([('x','Displacement'),('v','Velocity now'),('a','Acceleration')]),
  tryit='Choose “Turn around”. Move time past 4 s. Can the object move backward while its position is still positive?',
  answer='Yes. Velocity becomes negative after 4 s, so position decreases. The object remains to the right of its starting point throughout this six-second window. Negative velocity describes direction, not location.',
  assumption='One-dimensional motion, constant acceleration, x₀ = 0. Shaded area is signed displacement, not total distance. Position and velocity scales fit the full six-second motion; compare the axis values when changing parameters.',
  fallback='Example: v₀ = 4 m/s and a = −1 m/s². At 4 s, x = 8 m and v = 0. At 6 s, x = 6 m and v = −2 m/s.', source='https://openstax.org/books/university-physics-volume-1/pages/3-4-motion-with-constant-acceleration'),
 dict(key='circuits', subject='Physics', title='Same resistors. A different circuit.', intro='Switch between series and parallel. Follow where the voltage goes and how the current divides.', page='physics-12-circuits.html',
  controls=select('layout','Connection',[('series','Series'),('parallel','Parallel')])+slider('voltage','Battery voltage',2,12,1,12,'V')+slider('r1','Resistance R₁',2,12,1,4,'Ω')+slider('r2','Resistance R₂',2,12,1,8,'Ω'),
  stage=graph('circuit',270)+'<div class="viz-legend"><span><i></i>R₁ branch</span><span><i class="legend-b"></i>R₂ branch</span><span>Arrows: conventional current</span></div>'+graph('voltage-bars',150)+stats([('resistance','Equivalent resistance'),('current','Battery current'),('rule','Connection rule')]),
  tryit='With the same 12 V battery and 4 Ω / 8 Ω resistors, predict which connection draws more current. Then switch the connection.',
  answer='Series draws 1 A through both resistors. Parallel draws 4.5 A in total: 3 A through R₁ and 1.5 A through R₂. Adding a parallel path lowers the equivalent resistance.',
  assumption='Ideal DC source, ohmic resistors and zero-resistance wires. Diagram geometry and wire thickness do not encode current.', fallback='At 12 V with R₁ = 4 Ω and R₂ = 8 Ω: series R = 12 Ω; parallel R = 8/3 Ω.', source='https://openstax.org/books/university-physics-volume-2/pages/10-2-resistors-in-series-and-parallel'),
 dict(key='enzymes', subject='Biochemistry', title='Can more substrate overcome inhibition?', intro='Compare the untreated enzyme with three inhibition patterns. Watch the plateau and the substrate concentration at half-maximal rate.', page='biochem-03-enzymes.html',
  controls=select('mode','Inhibition pattern',[('competitive','Competitive'),('noncompetitive','Pure noncompetitive'),('uncompetitive','Uncompetitive')])+slider('strength','Inhibitor ratio [I] / Kᵢ',0,4,.5,2)+slider('substrate','Substrate [S]',0,20,.5,2,'mM'),
  stage='<div class="viz-diagram-heading"><b>Initial rate versus substrate</b><span>Horizontal axis: [S] (mM)</span></div>'+graph('enzyme',280)+'<div class="viz-legend"><span><i class="legend-base"></i>Without inhibitor</span><span><i></i>With inhibitor</span><span>Dot: selected [S]</span></div>'+stats([('rate','Initial rate v₀'),('vmax','Apparent Vmax'),('km','Apparent Km')]),
  tryit='Set [I]/Kᵢ to 2. Switch inhibition type while watching the plateau. Which pattern leaves Km unchanged?',
  answer='Pure noncompetitive inhibition leaves Km at 2 mM and reduces Vmax to one third. Competitive inhibition preserves Vmax but raises Km. Uncompetitive inhibition lowers both by the same factor.',
  assumption='Steady-state Michaelis–Menten model. Baseline Vmax = 100 μM/min, Km = 2 mM. α = 1 + [I]/Kᵢ. Pure noncompetitive assumes equal inhibitor affinity for E and ES.', fallback='At [S] = 2 mM and [I]/Kᵢ = 2, competitive inhibition gives v₀ = 25 μM/min, Vmax = 100 μM/min and apparent Km = 6 mM.', source='https://openstax.org/books/biology-2e/pages/6-5-enzymes'),
 dict(key='glycolysis', subject='Biochemistry', title='Follow the carbon. Keep the ATP ledger.', intro='Step through one glucose molecule’s journey. See exactly when the pathway splits, spends ATP and earns it back.', page='biochem-glycolysis-steps.html',
  controls=slider('step','Completed reaction',0,10,1,0) + '<div class="viz-presets"><button type="button" data-step-back>← Previous</button><button type="button" data-step-next>Next →</button></div><p class="local-note">All totals are per original glucose. After the split, each payoff reaction happens twice.</p>',
  stage=graph('carbon',180)+'<div class="viz-steps">'+''.join(f'<button type="button" data-step="{i}" aria-label="Show glycolysis step {i}">{i}</button>' for i in range(1,11))+'</div><div class="viz-step-copy" data-step-copy></div>'+graph('ledger',170)+'<p class="local-note">Horizontal axis: completed reaction step.</p>'+stats([('net','Net ATP'),('nadh','NADH made'),('carbon','Carbon retained')]),
  tryit='Stop at step 7. Two ATP have just been produced. Is glycolysis already making a net ATP profit?',
  answer='No. Those two ATP repay the investment at steps 1 and 3. Net ATP is zero after step 7. Step 10 produces two more ATP, bringing the net yield to two per glucose.',
  assumption='Standard glycolysis from glucose to pyruvate. NADH is counted separately; its later ATP yield depends on how it is reoxidised. Carbon circles are bookkeeping, not molecular structures.', fallback='Per glucose: spend 2 ATP, make 4 ATP and 2 NADH, finish with two 3-carbon pyruvates. Net ATP = 2.', source='https://openstax.org/books/biology-2e/pages/7-2-glycolysis'),
 dict(key='osmosis', subject='Biology', title='Water moves. The trapped solute stays.', intro='Change the surrounding solution, then move the equilibration slider. Track concentration and volume together.', page='biology-01-cells.html',
  controls=slider('outside','Outside nonpenetrating solute',150,600,25,450,'mOsm/L')+slider('fraction','Progress toward equilibrium',0,100,1,0,'%')+'<fieldset><legend>Compare solutions</legend><div class="viz-presets"><button type="button" data-preset="hypo">Hypotonic</button><button type="button" data-preset="iso">Isotonic</button><button type="button" data-preset="hyper">Hypertonic</button></div></fieldset>',
  stage=graph('compartment',250)+'<div class="viz-legend"><span><i class="legend-base"></i>Initial size</span><span>Dots: fixed solute amount</span></div>'+stats([('volume','Relative volume'),('inside','Inside concentration'),('direction','Net water movement')]),
  tryit='Start in a 600 mOsm/L solution. Before moving the equilibration slider, predict the final volume. Will the amount of trapped solute change?',
  answer='The final volume is half the initial volume. The trapped solute amount stays fixed; losing water doubles its concentration from 300 to 600 mOsm/L.',
  assumption='Ideal flexible compartment with fixed nonpenetrating solute; starts at 300 mOsm/L. Infinite outside reservoir, no pressure difference, no solute transport or volume regulation. Slider is not elapsed time. Circle area encodes relative volume. This is not a real-cell swelling or lysis model.', fallback='At equilibrium, CᵢV = Cᵢ₀V₀. An outside concentration of 450 mOsm/L gives V/V₀ = 300/450 = 0.67.', source='https://openstax.org/books/biology-2e/pages/5-2-passive-transport'),
 dict(key='inheritance', subject='Biology', title='Build the cross, one allele at a time.', intro='Choose each parent’s genotype. Follow their gametes into the square and separate genotype from phenotype.', page='biology-03-genetics.html',
  controls=select('p1','Parent 1',[('Aa','Aa · heterozygous'),('AA','AA · homozygous'),('aa','aa · homozygous')])+select('p2','Parent 2',[('Aa','Aa · heterozygous'),('AA','AA · homozygous'),('aa','aa · homozygous')])+select('display','Colour cells by',[('phenotype','Phenotype'),('genotype','Genotype')]),
  stage='<div data-cross></div><div class="viz-legend"><span class="viz-allele-a">First letter: parent 1</span><span class="viz-allele-b">Second letter: parent 2</span></div><div data-ratio></div>'+stats([('aa','AA probability'),('hetero','Aa probability'),('recessive','aa probability')]),
  tryit='Compare Aa × Aa with Aa × aa. Why does a 3:1 phenotype ratio become 1:1 even though A is still dominant?',
  answer='An aa parent always contributes a. In Aa × aa, half the offspring receive A from the heterozygous parent and half receive a. Dominance affects expression, not the probability that an allele enters a gamete.',
  assumption='One autosomal locus, equal segregation, random fertilisation, complete dominance of A and equal viability. Each square is a 25% probability, not a guarantee of four children.', fallback='Aa × Aa gives 25% AA, 50% Aa and 25% aa. With complete dominance, 75% show the dominant phenotype.', source='https://openstax.org/books/biology-2e/pages/12-2-characteristics-and-traits')
]

def render(lab, standalone=False):
    key=lab['key']
    target=key if standalone else 'visual-lab'
    return f'''<section class="viz-lab" id="{target}" data-viz="{key}" aria-labelledby="{key}-title">
<div class="viz-heading"><p class="eyebrow">{lab['subject']} / Visual Lab</p><h2 id="{key}-title">{lab['title']}</h2><p>{lab['intro']}</p></div>
<p class="viz-fallback">{lab['fallback']} Enable JavaScript to explore the model.</p>
<div class="viz-workspace" hidden><div class="viz-stage">{lab['stage']}</div><form class="viz-controls" aria-label="{lab['subject']} model controls">{lab['controls']}<button class="btn" type="reset">Reset experiment</button></form></div>
<div class="viz-insight" hidden><p data-insight role="status" aria-live="polite" aria-atomic="true"></p></div>
<div class="viz-discovery"><div><p class="eyebrow">Try this</p><p>{lab['tryit']}</p></div><details><summary>Check your reasoning</summary><p>{lab['answer']}</p></details></div>
<div class="viz-footnote"><p>{lab['assumption']}</p><a href="{lab['page']}">Read the full lesson</a><a href="{lab['source']}">Textbook reference</a></div></section>'''

def build():
    for lab in LABS:
        path=ROOT/'pages'/lab['page']
        source=path.read_text()
        block='<!-- visual:start -->\n'+render(lab)+'\n<!-- visual:end -->\n'
        if '<!-- visual:start -->' in source:
            source=re.sub(r'<!-- visual:start -->.*?<!-- visual:end -->\n',lambda m:block,source,flags=re.S)
        else:
            source=source.replace('  <nav class="toc',block+'  <nav class="toc',1)
            source=source.replace('<ol>','<ol>\n      <li><a href="#visual-lab">Visual Lab · '+lab['title']+'</a></li>',1)
        if '../assets/css/visuals.css' not in source:
            source=source.replace('</head>','<link rel="stylesheet" href="../assets/css/visuals.css">\n</head>',1)
        if '../assets/js/visuals.js' not in source:
            source=source.replace('</body>','<script src="../assets/js/visual-models.js"></script>\n<script src="../assets/js/visuals.js"></script>\n</body>',1)
        path.write_text(source)
    nav=''.join(f'<a href="#{lab["key"]}" data-lab-link="{lab["key"]}"><small>{lab["subject"]}</small>{label}</a>' for lab,label in zip(LABS,['Motion','Circuits','Enzymes','Glycolysis','Osmosis','Inheritance']))
    content='\n'.join(render(lab,True) for lab in LABS)
    (ROOT/'pages/visual-lab.html').write_text(f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Visual Lab — PostMed Notebook</title><meta name="description" content="Six interactive science lessons: motion graphs, series and parallel circuits, enzyme inhibition, glycolysis, osmosis and Mendelian inheritance. Change a variable and see why the result changes.">
<link rel="stylesheet" href="../assets/css/site.css"><link rel="stylesheet" href="../assets/css/visuals.css"></head>
<body class="visual-page"><a class="skip-link" href="#main">Skip to content</a><header class="topbar"><div class="topbar__inner"><a class="brand" href="../index.html"><span class="brand__mark">PM</span>PostMed Notebook</a><nav aria-label="Main navigation"><a href="../index.html#library">Lesson library</a><a href="biochem-terms.html">Terms reference</a><button class="theme-toggle" data-theme-toggle type="button" aria-label="Toggle dark / light mode">◐</button></nav></div></header>
<main class="wrap" id="main"><div class="article-head"><p class="eyebrow">The Visual Lab</p><h1>Change something. See why.</h1><p class="lede">Six small experiments for the ideas that are easier to understand when you can see them. Choose a topic, make a prediction, then test it.</p></div><nav class="visual-nav" aria-label="Choose an experiment">{nav}</nav>{content}</main>
<footer class="site-footer"><div class="wrap"><p><strong>PostMed Notebook</strong> · Interactive models for learning. Every model states its assumptions and links to the full lesson.</p></div></footer>
<script src="../assets/js/study.js?v=visual-lab-1"></script><script src="../assets/js/site.js"></script><script src="../assets/js/visual-models.js"></script><script src="../assets/js/visuals.js"></script></body></html>''')
    print('Generated six lesson embeds and the Visual Lab.')
if __name__ == '__main__': build()
