from pathlib import Path
p=Path('main.py')
s=p.read_text()
anchor='</style>\n</head>\n<body>'
extra='''
/* NexoVIP Aurora Command Center — visual layer only */
:root{
  --gold:#ff3155;--gold2:#ff8a9d;--gold3:#8d102b;
  --black:#030405;--black2:#090b0f;--black3:#11151b;
  --surface:rgba(13,16,22,.82);--surface2:rgba(16,20,27,.86);--surface3:rgba(25,30,39,.78);
  --border:rgba(255,255,255,.085);--border2:rgba(255,49,85,.42);
  --text:#f7f8fb;--text2:#ff9aaa;--text3:rgba(190,199,214,.62);
  --gold-glow:0 0 30px rgba(255,49,85,.22);
}
body{background:var(--black);letter-spacing:.01em}
.bg-fixed{background:radial-gradient(circle at 8% 8%,rgba(255,49,85,.17),transparent 25%),radial-gradient(circle at 88% 18%,rgba(123,16,48,.14),transparent 28%),radial-gradient(circle at 52% 110%,rgba(255,49,85,.08),transparent 35%)}
.grid-fixed{opacity:.42;background-size:72px 72px;background-image:linear-gradient(rgba(255,49,85,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,49,85,.035) 1px,transparent 1px)}
.sidebar{background:linear-gradient(180deg,rgba(9,11,15,.94),rgba(5,6,9,.9));border-right-color:rgba(255,49,85,.2);box-shadow:10px 0 40px rgba(0,0,0,.25)}
.sb-brand{padding:20px 0;border-bottom-color:rgba(255,49,85,.2)}
.sb-title{color:var(--gold2);font-weight:700}
.nav-item{border-radius:14px;padding:11px 6px}
.nav-item.active{background:linear-gradient(135deg,rgba(255,49,85,.2),rgba(255,49,85,.045));border-color:rgba(255,49,85,.42);box-shadow:inset 3px 0 var(--gold),0 0 24px rgba(255,49,85,.12)}
.main{padding:30px 34px 60px}
.page-title{font-size:18px;letter-spacing:.06em;text-shadow:0 0 20px rgba(255,49,85,.16)}
.page-sub{color:rgba(190,199,214,.68)}
.stat-card,.card{background:linear-gradient(145deg,rgba(21,26,35,.88),rgba(10,13,18,.9));border-color:rgba(255,255,255,.1);border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.16),inset 0 1px rgba(255,255,255,.035)}
.stat-card::before,.card::before{height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.6}
.stat-card:hover,.card:hover{border-color:rgba(255,49,85,.34);box-shadow:0 18px 50px rgba(0,0,0,.22),0 0 30px rgba(255,49,85,.1)}
.stat-label{color:var(--text3);letter-spacing:.13em}
.stat-val{font-size:22px}
.btn-gold{background:linear-gradient(110deg,#c9153d 0%,#ff3155 48%,#ff7187 100%);color:#fff;box-shadow:0 8px 24px rgba(255,49,85,.22)}
.btn-gold:hover{box-shadow:0 10px 32px rgba(255,49,85,.4);filter:saturate(1.15) brightness(1.08)}
.btn-ghost{background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.12)}
.fi,.fs,.search-wrap input{background:rgba(3,5,8,.58);border-color:rgba(255,255,255,.11)}
.fi:focus,.fs:focus,.search-wrap input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(255,49,85,.1),0 0 18px rgba(255,49,85,.08)}
.tbl th{background:rgba(255,49,85,.06);color:var(--text2);border-bottom-color:rgba(255,49,85,.2)}
.tbl td{border-bottom-color:rgba(255,255,255,.07)}
.tag-vless,.act-copy{background:rgba(255,49,85,.13);border-color:rgba(255,49,85,.3)}
.mo{background:rgba(0,0,0,.82);backdrop-filter:blur(14px)}
.mo-box,.login-box{background:linear-gradient(145deg,rgba(22,26,35,.97),rgba(8,10,14,.98));border-color:rgba(255,49,85,.38);box-shadow:0 25px 90px rgba(0,0,0,.5),0 0 34px rgba(255,49,85,.15)}
.mo-title,.login-title{color:var(--gold2);text-shadow:0 0 18px rgba(255,49,85,.2)}
@media(max-width:768px){.main{padding-left:20px;padding-right:20px}.card,.stat-card{box-shadow:0 10px 28px rgba(0,0,0,.18)}}
'''
if anchor not in s: raise SystemExit('style anchor not found')
s=s.replace(anchor,extra+anchor,1)
p.write_text(s)
'''
}