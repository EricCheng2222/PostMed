/* Small, inspectable experiments. No animation loops, network calls or dependencies. */
(function () {
  'use strict';
  var M = window.PostMedVisualModels;
  if (!M) return;
  var roots = Array.from(document.querySelectorAll('[data-viz]'));
  var round = function (n, digits) { return Number(n.toFixed(digits === undefined ? 1 : digits)).toString(); };
  var text = function (x, y, value, attrs) { return '<text x="' + x + '" y="' + y + '" ' + (attrs || '') + '>' + value + '</text>'; };
  var line = function (x1, y1, x2, y2, cls, extra) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + (cls || 'axis') + '" ' + (extra || '') + '/>'; };
  function size(svg, height) {
    var width = Math.max(280, Math.min(720, svg.clientWidth || svg.parentElement.clientWidth || 440));
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    return width;
  }
  function chart(svg, ymin, ymax, xmax, height, ticks) {
    var width = size(svg, height), left = 46, right = width - 18, top = 24, bottom = height - 32;
    var x = function (t) { return left + t / xmax * (right - left); };
    var y = function (v) { return bottom - (v - ymin) / (ymax - ymin) * (bottom - top); };
    var html = '';
    [ymin, (ymin + ymax) / 2, ymax].forEach(function (v) {
      html += line(left,y(v),right,y(v),'gridline') + text(left - 7,y(v) + 4,round(v),'text-anchor="end"');
    });
    (ticks || [0, xmax / 3, 2 * xmax / 3, xmax]).forEach(function (t) {
      html += line(x(t),top,x(t),bottom,'gridline') + text(x(t),bottom + 22,round(t),'text-anchor="middle"');
    });
    html += line(left,top,left,bottom) + line(left,y(0),right,y(0));
    return { x: x, y: y, width: width, top: top, bottom: bottom, html: html };
  }
  function curve(c, fn, end, cls) {
    var points = [];
    for (var i = 0; i <= 100; i++) { var t = end * i / 100; points.push(c.x(t) + ',' + c.y(fn(t))); }
    return '<polyline class="' + (cls || 'trace') + '" points="' + points.join(' ') + '"/>';
  }
  function dot(x,y) { return '<circle class="marker" cx="'+x+'" cy="'+y+'" r="5"/>'; }
  function arrow(x1,y1,x2,y2,color) {
    var angle = Math.atan2(y2-y1,x2-x1), length = 8;
    return line(x1,y1,x2,y2,'', 'style="stroke:'+color+';stroke-width:2.5"') + '<path d="M'+(x2-length*Math.cos(angle-.5))+','+(y2-length*Math.sin(angle-.5))+' L'+x2+','+y2+' L'+(x2-length*Math.cos(angle+.5))+','+(y2-length*Math.sin(angle+.5))+'" fill="none" stroke="'+color+'" stroke-width="2.5"/>';
  }
  var steps = [
    ['Glucose · start', 'Six carbons enter together. No ATP has been spent yet.', 'Glucose'],
    ['1 · Hexokinase', 'Invest one ATP to phosphorylate glucose. The carbon count stays at six.', 'Glucose 6-P'],
    ['2 · Phosphoglucose isomerase', 'Rearrange the sugar into a ketose. No ATP or NADH changes hands.', 'Fructose 6-P'],
    ['3 · Phosphofructokinase-1', 'Invest a second ATP. This is the committed step of glycolysis.', 'Fructose 1,6-BP'],
    ['4 · Aldolase', 'Split the six-carbon intermediate into two three-carbon molecules: G3P and DHAP.', 'G3P + DHAP'],
    ['5 · Triose phosphate isomerase', 'Convert DHAP to G3P. Now both three-carbon units can enter the payoff phase.', '2 × G3P'],
    ['6 · G3P dehydrogenase', 'Oxidise both G3P molecules and add inorganic phosphate. Make two NADH; no ATP yet.', '2 × 1,3-BPG'],
    ['7 · Phosphoglycerate kinase', 'Each three-carbon intermediate makes one ATP. Two ATP earned; the investment is repaid.', '2 × 3-PG'],
    ['8 · Phosphoglycerate mutase', 'Move the phosphate from carbon 3 to carbon 2. No ATP is spent or made.', '2 × 2-PG'],
    ['9 · Enolase', 'Remove water to form phosphoenolpyruvate. No ATP is made in this step.', '2 × PEP'],
    ['10 · Pyruvate kinase', 'Each PEP transfers its phosphate to ADP. Two more ATP are made; finish with two pyruvates.', '2 × pyruvate']
  ];
  roots.forEach(function (root) {
    var kind = root.dataset.viz;
    var controls = Array.from(root.querySelectorAll('[data-control]'));
    var defaults = {};
    controls.forEach(function (control) { defaults[control.dataset.control] = control.value; });
    var graph = function (name) { return root.querySelector('[data-graph="' + name + '"]'); };
    var stat = function (name,value) { root.querySelector('[data-stat="'+name+'"]').textContent = value; };
    var insight = function (html) { root.querySelector('[data-insight]').innerHTML = html; };
    var set = function (key, value) { root.querySelector('[data-control="'+key+'"]').value = value; };
    function read() {
      var values = {};
      controls.forEach(function (control) {
        values[control.dataset.control] = control.tagName === 'SELECT' ? control.value : Number(control.value);
        var output = root.querySelector('[data-value="'+control.dataset.control+'"]');
        if (output) output.textContent = control.value + (control.dataset.unit ? ' ' + control.dataset.unit : '');
      });
      return values;
    }
    function motion(v) {
      var now = M.motion(v.v0,v.a,v.t);
      function scale(max) {
        if(max<1)return 1;
        var power=Math.pow(10,Math.floor(Math.log10(max)));
        return [1,2,5,10].find(function (step) {return step*power>=max;})*power;
      }
      var turn=v.a ? -v.v0/v.a : 0;
      var extreme=turn>0 && turn<6 ? Math.abs(M.motion(v.v0,v.a,turn).x) : 0;
      var xmax=scale(Math.max(extreme,Math.abs(M.motion(v.v0,v.a,6).x)));
      var vmax=scale(Math.max(Math.abs(v.v0),Math.abs(M.motion(v.v0,v.a,6).v)));
      [['position',-xmax,xmax,'x'],['velocity',-vmax,vmax,'v'],['acceleration',-4,4,'a']].forEach(function (spec) {
        var svg = graph(spec[0]), c = chart(svg,spec[1],spec[2],6,160);
        var fn = function (t) { return M.motion(v.v0,v.a,t)[spec[3]]; };
        var html = c.html;
        if (spec[0] === 'velocity') {
          var splits = [0,v.t], zero = v.a ? -v.v0/v.a : -1;
          if (zero>0 && zero<v.t) splits.splice(1,0,zero);
          for (var j=1;j<splits.length;j++) {
            var start=splits[j-1], end=splits[j], negative=fn((start+end)/2)<0;
            html += '<path d="M'+c.x(start)+','+c.y(0)+' L'+c.x(start)+','+c.y(fn(start))+' L'+c.x(end)+','+c.y(fn(end))+' L'+c.x(end)+','+c.y(0)+' Z" fill="var(--plot-'+(negative?'b':'a')+')" opacity=".2"/>';
          }
        }
        html += curve(c,fn,6) + line(c.x(v.t),c.top,c.x(v.t),c.bottom,'guide') + dot(c.x(v.t),c.y(fn(v.t)));
        svg.innerHTML = html;
        svg.setAttribute('aria-label',spec[0]+' over time, 0 to 6 seconds. At '+v.t+' seconds the value is '+round(fn(v.t))+'.');
      });
      stat('x',round(now.x)+' m'); stat('v',round(now.v)+' m/s'); stat('a',round(now.a)+' m/s²');
      var direction = now.v>0 ? 'moving in the positive direction' : now.v<0 ? 'moving in the negative direction' : 'instantaneously at rest';
      insight('<strong>At '+round(v.t)+' s:</strong> the object is '+direction+'. The slope of position is '+round(now.v)+' m/s; the signed area under velocity is '+round(now.x)+' m. '+(now.v*v.a<0 ? 'Velocity and acceleration have opposite signs, so it is slowing down.' : now.v*v.a>0 ? 'Velocity and acceleration have the same sign, so it is speeding up.' : v.a===0 ? 'Zero acceleration keeps velocity constant.' : 'Zero velocity does not mean zero acceleration.'));
    }
    function circuits(v) {
      var parallel=v.layout==='parallel', r=M.circuit(v.voltage,v.r1,v.r2,parallel);
      var svg=graph('circuit'), w=size(svg,270), left=40, right=w-22;
      var html=line(left,45,right,45)+line(left,235,right,235)+line(left,45,left,110)+line(left,130,left,235)+line(left-17,110,left+17,110)+line(left-9,130,left+9,130)+text(12,105,'+')+text(12,143,'−')+text(left+25,126,v.voltage+' V');
      function resistor(x,y,label,value,color,vertical) {
        return '<rect x="'+(x-(vertical?10:25))+'" y="'+(y-(vertical?25:10))+'" width="'+(vertical?20:50)+'" height="'+(vertical?50:20)+'" fill="var(--card)" stroke="'+color+'" stroke-width="2.5"/>'+text(x,y-(vertical?38:22),label+' '+value+' Ω','text-anchor="middle"');
      }
      if (parallel) {
        [0.46,0.82].forEach(function (fraction,i) {
          var x=w*fraction, col=i?'var(--plot-b)':'var(--plot-a)', current=i?r.i2:r.i1;
          html+=line(x,45,x,235)+resistor(x,136,'R'+(i?'₂':'₁'),i?v.r2:v.r1,col,true)+arrow(x,177,x,216,col)+text(x-13,193,round(current,2)+' A','text-anchor="end"');
        });
      } else {
        html+=line(right,45,right,235)+resistor(w*.43,45,'R₁',v.r1,'var(--plot-a)')+resistor(w*.8,45,'R₂',v.r2,'var(--plot-b)')+arrow(w*.3,235,w*.2,235,'var(--plot-a)')+text(w*.67,170,round(r.current,2)+' A everywhere','text-anchor="middle"');
      }
      svg.innerHTML=html;
      svg.setAttribute('aria-label',(parallel?'Parallel':'Series')+' circuit. Total current '+round(r.current,2)+' amperes. R1 current '+round(r.i1,2)+' A; R2 current '+round(r.i2,2)+' A.');
      var bars=graph('voltage-bars'), width=size(bars,150), start=47, end=width-70;
      bars.innerHTML=text(0,18,'Voltage across each resistor','class="graph-label"')+[r.v1,r.v2].map(function (voltage,i) { var y=43+i*48; return text(0,y+19,i?'R₂':'R₁')+'<rect x="'+start+'" y="'+y+'" width="'+(end-start)+'" height="28" fill="var(--line)" rx="3"/><rect x="'+start+'" y="'+y+'" width="'+((end-start)*voltage/12)+'" height="28" fill="var(--plot-'+(i?'b':'a')+')" rx="3"/>'+text(end+8,y+19,round(voltage,2)+' V'); }).join('');
      bars.setAttribute('aria-label','R1 voltage '+round(r.v1,2)+' volts; R2 voltage '+round(r.v2,2)+' volts. Fixed scale 0 to 12 volts.');
      stat('resistance',round(r.resistance,2)+' Ω'); stat('current',round(r.current,2)+' A'); stat('rule',parallel?'Same voltage':'Same current');
      insight(parallel?'<strong>Current splits:</strong> '+round(r.i1,2)+' A + '+round(r.i2,2)+' A = '+round(r.current,2)+' A from the battery. Both resistors have the full '+v.voltage+' V across them.':'<strong>Voltage divides:</strong> '+round(r.v1,2)+' V + '+round(r.v2,2)+' V = '+v.voltage+' V. The same '+round(r.current,2)+' A flows through both resistors.');
    }
    function enzymes(v) {
      var svg=graph('enzyme'), c=chart(svg,0,120,20,280), r=M.enzyme(v.substrate,v.mode,v.strength);
      var current=function (s) {return M.enzyme(s,v.mode,v.strength).rate;};
      svg.innerHTML=c.html+curve(c,function (s) {return M.enzyme(s,'competitive',0).rate;},20,'baseline')+curve(c,current,20)+line(c.x(0),c.y(r.vmax),c.x(20),c.y(r.vmax),'guide')+text(c.x(20),c.y(r.vmax)-7,'Vmax '+round(r.vmax),'text-anchor="end"')+line(c.x(r.km),c.y(0),c.x(r.km),c.y(r.vmax/2),'guide')+dot(c.x(r.km),c.y(r.vmax/2))+text(c.x(r.km)+7,c.y(r.vmax/2)-7,'½ Vmax')+line(c.x(v.substrate),c.top,c.x(v.substrate),c.bottom,'guide')+dot(c.x(v.substrate),c.y(r.rate))+text(c.x(0),15,'v₀ (μM/min)');
      svg.setAttribute('aria-label',v.mode+' inhibition: apparent Vmax '+round(r.vmax)+' micromolar per minute, apparent Km '+round(r.km,2)+' millimolar. At substrate '+v.substrate+' millimolar, rate '+round(r.rate)+' micromolar per minute.');
      stat('rate',round(r.rate)+' μM/min'); stat('vmax',round(r.vmax)+' μM/min'); stat('km',round(r.km,2)+' mM');
      var message=v.mode==='competitive'?'The curve shifts right; its eventual plateau stays at 100 μM/min. More substrate can overcome competitive inhibition.':v.mode==='noncompetitive'?'The plateau falls, but the half-maximal point stays at Km = 2 mM. More substrate cannot restore the original Vmax.':'The plateau and Km fall together. More substrate cannot restore the original Vmax.';
      insight('<strong>'+(v.strength===0?'No inhibitor is present. Both curves coincide.':message)+'</strong> At [S] = '+v.substrate+' mM, the rate is '+round(r.rate)+' μM/min. A finite substrate concentration approaches the plateau; it never exactly reaches it.');
    }
    function glycolysis(v) {
      var step=v.step, r=M.glycolysis(step), svg=graph('carbon'), w=size(svg,180), html='';
      var groups=step<4?[{x:w/2,n:6,label:steps[step][2]}]:[{x:w*.27,n:3,label:step===4?'G3P':steps[step][2].replace('2 × ','')},{x:w*.73,n:3,label:step===4?'DHAP':steps[step][2].replace('2 × ','')}];
      groups.forEach(function (g) {
        var spacing=Math.min(30,(w*.4)/(g.n)), start=g.x-(g.n-1)*spacing/2;
        for(var i=0;i<g.n;i++) html+='<circle cx="'+(start+i*spacing)+'" cy="65" r="11" fill="var(--plot-a)"/>'+text(start+i*spacing,70,'C','text-anchor="middle" style="fill:var(--card);font-size:12px"');
        html+=text(g.x,108,g.label,'text-anchor="middle" class="graph-label"')+text(g.x,137,g.n+' carbons','text-anchor="middle"');
      });
      svg.innerHTML=text(0,20,step<4?'One six-carbon unit':'Two three-carbon units','class="graph-label"')+html;
      svg.setAttribute('aria-label',steps[step][2]+'. Six carbons in total. '+(step<4?'One six-carbon molecule.':'Two three-carbon molecules.'));
      root.querySelector('[data-step-copy]').innerHTML='<h3>'+steps[step][0]+'</h3><p>'+steps[step][1]+'</p>';
      root.querySelectorAll('[data-step]').forEach(function (button) {
        if(Number(button.dataset.step)===step)button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
        button.dataset.passed=String(Number(button.dataset.step)<step);
      });
      root.querySelector('[data-step-back]').disabled=step===0; root.querySelector('[data-step-next]').disabled=step===10;
      var ledger=graph('ledger'), c=chart(ledger,-2,4,10,170,[0,2,4,6,8,10]);
      var path='M'+c.x(0)+','+c.y(0), previous=0;
      for(var s=1;s<=10;s++){var at=M.glycolysis(s), net=at.made-at.spent;path+=' L'+c.x(s)+','+c.y(previous)+' L'+c.x(s)+','+c.y(net);previous=net;}
      ledger.innerHTML=c.html+'<path d="'+path+'" class="trace"/>'+line(c.x(step),c.top,c.x(step),c.bottom,'guide')+dot(c.x(step),c.y(r.made-r.spent))+text(c.x(0),16,'Net ATP per glucose');
      ledger.setAttribute('aria-label','Net ATP at step '+step+' is '+(r.made-r.spent)+'. '+r.spent+' ATP spent, '+r.made+' ATP made.');
      stat('net',(r.made-r.spent>0?'+':'')+(r.made-r.spent));stat('nadh',r.nadh);stat('carbon','6 of 6');
      insight('<strong>ATP made − ATP spent = net ATP:</strong> '+r.made+' − '+r.spent+' = '+(r.made-r.spent)+'. '+(step>=5?'Each remaining reaction occurs twice per glucose. ':step===4?'The two products differ; DHAP still needs to become G3P. ':'The ATP investment prepares the six-carbon sugar for splitting. ')+r.nadh+' NADH made so far.');
    }
    function osmosis(v) {
      var r=M.osmosis(v.outside,v.fraction/100), svg=graph('compartment'), w=size(svg,270), cx=w*.44, cy=133, radius=55*Math.sqrt(r.volume);
      var html='<rect x="1" y="25" width="'+(w-2)+'" height="218" rx="10" fill="var(--card)" stroke="var(--line)"/>';
      html+='<circle cx="'+cx+'" cy="'+cy+'" r="55" fill="none" stroke="var(--ink-soft)" stroke-dasharray="5 4"/>';
      html+='<circle cx="'+cx+'" cy="'+cy+'" r="'+radius+'" fill="var(--accent-wash)" fill-opacity=".7" stroke="var(--plot-a)" stroke-width="2.5"/>';
      for(var i=0;i<18;i++) {var theta=i*2.39996, distance=radius*.8*Math.sqrt((i+.5)/18);html+='<circle cx="'+(cx+Math.cos(theta)*distance)+'" cy="'+(cy+Math.sin(theta)*distance)+'" r="3.5" fill="var(--plot-a)"/>';}
      var balanced=v.outside===300 || v.fraction===100;
      var x1=cx+radius+9, x2=w-24;
      if(!balanced)html+=r.direction==='in'?arrow(x2,cy,x1,cy,'var(--plot-b)'):arrow(x1,cy,x2,cy,'var(--plot-b)');
      html+=text(12,16,'Outside: '+v.outside+' mOsm/L','class="graph-label"')+text(cx,226,'Inside: '+round(r.inside)+' mOsm/L','text-anchor="middle"');
      svg.innerHTML=html;
      svg.setAttribute('aria-label','Ideal osmotic compartment. Volume '+round(r.volume,2)+' times initial. Inside '+round(r.inside)+' milliosmoles per litre; outside '+v.outside+'. '+(balanced?'No net water movement.':'Net water movement '+r.direction+'.'));
      stat('volume',round(r.volume,2)+' × V₀');stat('inside',round(r.inside)+' mOsm/L');stat('direction',balanced?'Balanced':r.direction==='in'?'Into compartment':'Out of compartment');
      insight('<strong>'+ (v.outside===300?'Isotonic: no volume change.':v.outside<300?'Hypotonic outside: water enters.':'Hypertonic outside: water leaves.')+'</strong> At equilibrium, volume is '+round(r.finalVolume,2)+' × V₀ because 300 ÷ '+v.outside+' = '+round(r.finalVolume,2)+'. '+(v.fraction===100?'There is still water exchange in both directions, but no net flow.':'The '+v.fraction+'% slider sets progress toward that volume, not a physical time scale.'));
    }
    function inheritance(v) {
      var r=M.cross(v.p1,v.p2), p1=v.p1.split(''),p2=v.p2.split('');
      var html='<table class="viz-matrix"><caption>Gametes combine at random. Each cell has probability ¼.</caption><thead><tr><th scope="col">P₁ ↓ / P₂ →</th>'+p2.map(function (a) {return '<th scope="col"><span class="viz-allele-b">'+a+'</span> · ½</th>';}).join('')+'</tr></thead><tbody>';
      p1.forEach(function (a,i) {
        html+='<tr><th scope="row"><span class="viz-allele-a">'+a+'</span> · ½</th>';
        p2.forEach(function (b,j) {
          var cell=r.cells[i*2+j], rec=cell.genotype==='aa', label=v.display==='phenotype'?(rec?'Recessive':'Dominant'):cell.genotype;
          var style=v.display==='genotype' && cell.genotype==='Aa'?' style="border-style:dashed;background:var(--card)"':'';
          html+='<td class="'+(rec?'recessive':'dominant')+'"'+style+'><b><span class="viz-allele-a">'+a+'</span><span class="viz-allele-b">'+b+'</span></b><small>'+label+' · 25%</small></td>';
        });
        html+='</tr>';
      });
      root.querySelector('[data-cross]').innerHTML=html+'</tbody></table>';
      root.querySelector('[data-ratio]').innerHTML='<div class="viz-diagram-heading"><b>Phenotype probability</b><span>Dominant '+r.dominant*25+'% / recessive '+r.recessive*25+'%</span></div><div class="viz-ratio" aria-hidden="true">'+(r.dominant?'<span class="ratio-dominant" style="width:'+r.dominant*25+'%">'+r.dominant*25+'%</span>':'')+(r.recessive?'<span class="ratio-recessive" style="width:'+r.recessive*25+'%">'+r.recessive*25+'%</span>':'')+'</div>';
      stat('aa',r.counts.AA*25+'%');stat('hetero',r.counts.Aa*25+'%');stat('recessive',r.counts.aa*25+'%');
      insight('<strong>'+v.p1+' × '+v.p2+':</strong> '+r.counts.AA*25+'% AA, '+r.counts.Aa*25+'% Aa and '+r.counts.aa*25+'% aa. '+r.dominant*25+'% show the dominant phenotype. '+(v.p1===v.p1[0]+v.p1[0] || v.p2===v.p2[0]+v.p2[0]?'Repeated gamete labels are the same allele; the duplicate rows or columns keep all four equally likely combinations visible.':'Each heterozygous parent contributes A or a with equal probability.'));
    }
    var draw={motion:motion,circuits:circuits,enzymes:enzymes,glycolysis:glycolysis,osmosis:osmosis,inheritance:inheritance}[kind];
    function render() { draw(read()); }
    root.querySelector('.viz-workspace').hidden=false;
    render();
    root.querySelector('.viz-fallback').hidden=true;
    root.querySelector('.viz-insight').hidden=false;
    controls.forEach(function (control) { control.addEventListener('input',render); control.addEventListener('change',render); });
    root.querySelector('form').addEventListener('submit',function (event) { event.preventDefault(); });
    root.querySelector('form').addEventListener('reset',function (event) {
      event.preventDefault(); Object.keys(defaults).forEach(function (key) {set(key,defaults[key]);});render();
    });
    root.addEventListener('click',function (event) {
      var button=event.target.closest('button');if(!button)return;
      var preset=button.dataset.preset;
      if(preset && kind==='motion') { var values={turn:[4,-1],steady:[4,0],rest:[0,2]}[preset];set('v0',values[0]);set('a',values[1]);set('t',4);render(); }
      if(preset && kind==='osmosis') {set('outside',{hypo:150,iso:300,hyper:600}[preset]);set('fraction',0);render();}
      if(kind==='glycolysis') {
        var step=read().step;
        if(button.hasAttribute('data-step')) step=Number(button.dataset.step);
        else if(button.hasAttribute('data-step-back'))step--;
        else if(button.hasAttribute('data-step-next'))step++;
        else return;
        set('step',Math.max(0,Math.min(10,step)));render();
      }
    });
    // Recompute SVG coordinates when the containing column actually changes width.
    if('ResizeObserver' in window) {
      var lastWidth=0;
      new ResizeObserver(function (entries) {
        var width=Math.round(entries[0].contentRect.width);
        if(width>0 && width!==lastWidth) {lastWidth=width;render();}
      }).observe(root.querySelector('.viz-stage'));
    }
  });
  if(document.body.classList.contains('visual-page')) {
    function chooseLab() {
      var key=location.hash.slice(1), selected=roots.find(function (root) {return root.id===key;}) || roots[0];
      roots.forEach(function (root) {root.hidden=root!==selected;});
      document.querySelectorAll('[data-lab-link]').forEach(function (link) {
        link.setAttribute('aria-current',String(link.dataset.labLink===selected.id));
      });
    }
    window.addEventListener('hashchange',chooseLab);chooseLab();
  }
})();
