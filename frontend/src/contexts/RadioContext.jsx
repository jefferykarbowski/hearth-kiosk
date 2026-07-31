import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const RadioContext = createContext(null);

// Full station list using local logos from /logos/ folder
const DEFAULT_STATIONS = [
  {
    id: 'wcbn',
    name: 'WCBN',
    streamUrl: 'http://floyd.wcbn.org:8000/wcbn-hd.mp3',
    logo: '/logos/wcbn.png',
    genre: 'FM Ann Arbor'
  },
  {
    id: 'kfjc',
    name: 'KFJC',
    streamUrl: 'http://netcast.kfjc.org/kfjc-320k-aac',
    logo: '/logos/kfjc.gif',
    genre: 'The Wave of the West'
  },
  {
    id: 'kalx',
    name: 'KALX',
    streamUrl: 'https://stream.kalx.berkeley.edu:8443/kalx.flac',
    logo: '/logos/kalx.png',
    genre: 'UC Berkeley'
  },
  {
    id: 'wfmu',
    name: 'WFMU',
    streamUrl: 'http://stream0.wfmu.org/freeform-128k',
    logo: '/logos/wfmu.svg',
    genre: 'Freeform • Jersey City'
  },
  {
    id: 'kcrw',
    name: 'KCRW',
    streamUrl: 'https://streams.kcrw.com/kcrw_aac',
    logo: '/logos/kcrw.png',
    genre: 'Always on LA'
  },
  {
    id: 'nts1',
    name: 'NTS 1',
    streamUrl: 'https://stream-relay-geo.ntslive.net/stream',
    logo: '/logos/nts.png',
    genre: 'NTS Radio • London'
  },
  {
    id: 'nts2',
    name: 'NTS 2',
    streamUrl: 'https://stream-relay-geo.ntslive.net/stream2',
    logo: '/logos/nts.png',
    genre: 'NTS Radio • Channel 2'
  },
  {
    id: 'wtul',
    name: 'WTUL',
    streamUrl: 'https://stream.wtulneworleans.com/',
    logo: '/logos/wtul.png',
    genre: 'New Orleans'
  },
  {
    id: 'wmbr',
    name: 'WMBR',
    streamUrl: 'http://wmbr.org:8000/hi',
    logo: '/logos/wmbr.png',
    genre: 'MIT Campus Radio'
  },
  {
    id: 'krbx',
    name: 'KRBX',
    streamUrl: 'http://radioboise-ice.streamguys1.com/live',
    logo: '/logos/krbx.png',
    genre: 'Radio Boise'
  },
  {
    id: 'kzsc',
    name: 'KZSC',
    streamUrl: 'https://kzscfms1-geckohost.radioca.st/kzschigh',
    logo: '/logos/kzsc.png',
    genre: 'Santa Cruz • 88.1 FM'
  },
  {
    id: 'freeform-portland',
    name: 'Freeform Portland',
    streamUrl: 'http://listen.freeformportland.org:8000/stream',
    logo: '/logos/freeform-portland.png',
    genre: 'Community Driven Radio'
  },
  {
    id: 'kxci',
    name: 'KXCI',
    streamUrl: 'https://kxci.broadcasttool.stream:80/play',
    logo: '/logos/kxci.png',
    genre: "Tucson's Community Radio"
  },
  {
    id: 'kmud',
    name: 'KMUD',
    streamUrl: 'https://kmud.streamguys1.com/live',
    logo: '/logos/kmud.png',
    genre: 'Redwood Community Radio'
  },
  {
    id: 'radio-free-brooklyn',
    name: 'Radio Free Brooklyn',
    streamUrl: 'https://patmos.cdnstream.com/proxy/ttenney1/?mp=/listen&esPlayer&cb=239941.mp3',
    logo: '/logos/radio-free-brooklyn.png',
    genre: 'What Brooklyn Sounds Like'
  },
  {
    id: 'chirp',
    name: 'CHIRP Radio',
    streamUrl: 'https://peridot.streamguys1.com:5185/live',
    logo: '/logos/chirp.png',
    genre: 'Chicago Independent Radio'
  },
  {
    id: 'kuoi',
    name: 'KUOI-FM',
    streamUrl: 'https://s2.radio.co/sedf30688d/listen',
    logo: '/logos/kuoi.png',
    genre: 'University of Idaho'
  },
  {
    id: 'wluw',
    name: 'WLUW-FM',
    streamUrl: 'https://ice26.securenetsystems.net/WLUW?playSessionID=AD47E8CB-E610-56AC-09E96DB77F17E09B',
    logo: '/logos/wluw.png',
    genre: 'Loyola University Chicago'
  },
  {
    id: 'koto',
    name: 'KOTO',
    streamUrl: 'http://playerservices.streamtheworld.com/api/livestream-redirect/KOTOFM.mp3',
    logo: '/logos/koto.png',
    genre: 'A Rare Medium, Well-Done'
  },
  {
    id: 'ckut',
    name: 'CKUT',
    streamUrl: 'https://delray.ckut.ca:8001/ckut-live-128',
    logo: '/logos/ckut.png',
    genre: 'Montreal Community Radio'
  },
  {
    id: 'wzbt',
    name: 'WZBT 91.1',
    streamUrl: 'https://wzbt.streamguys1.com/live',
    logo: '/logos/wzbt.png',
    genre: "Gettysburg's Best New Music"
  },
  {
    id: 'wmrw',
    name: 'WMRW-LP',
    streamUrl: 'http://69.54.28.12:8951/listen',
    logo: '/logos/wmrw.png',
    genre: 'LP Warren'
  },
  {
    id: 'wruv',
    name: 'WRUV',
    streamUrl: 'http://icecast.uvm.edu:8005/wruv_fm_256',
    logo: '/logos/wruv.png',
    genre: 'WRUV 90.1 FM'
  },
  {
    id: 'kdvs',
    name: 'KDVS',
    streamUrl: 'https://archives.kdvs.org/stream',
    logo: '/logos/kdvs.png',
    genre: 'Freeform • Davis, CA'
  },
  {
    id: 'kspc',
    name: 'KSPC',
    streamUrl: 'https://kspc.radioca.st/stream?type=http&nocache=41177',
    logo: '/logos/kspc.png',
    genre: 'College Radio • Los Angeles'
  },
  {
    id: 'khdx',
    name: 'KHDX Radio',
    streamUrl: 'http://streaming.radio.co/s662abb673/listen',
    logo: '/logos/khdx.png',
    genre: 'Hendrix College • Conway, AR'
  },
  {
    id: 'wdcv',
    name: 'WDCV-FM',
    streamUrl: 'https://us2.internet-radio.com/proxy/wdcvfm?mp=/live',
    logo: '/logos/wdcv.png',
    genre: 'Voice of Dickinson College'
  },
  {
    id: 'kfai',
    name: 'KFAI-FM',
    streamUrl: 'https://kfai.broadcasttool.stream/kfai-1',
    logo: '/logos/kfai.png',
    genre: 'Minneapolis + St. Paul'
  },
  {
    id: 'kcpr',
    name: 'KCPR',
    streamUrl: 'https://ice23.securenetsystems.net:80/KCPR2',
    logo: '/logos/kcpr.png',
    genre: 'Cal Poly San Luis Obispo'
  },
  {
    id: 'kzum',
    name: 'KZUM',
    streamUrl: 'http://us4.internet-radio.com:8030/stream',
    logo: '/logos/kzum.png',
    genre: 'Local Radio • Lincoln, NE'
  },
  {
    id: 'wknc',
    name: 'WKNC',
    streamUrl: 'https://streaming.live365.com/a45877',
    logo: '/logos/wknc.png',
    genre: 'NC State College Radio'
  },
  {
    id: 'ksjs',
    name: 'KSJS',
    streamUrl: 'http://streaming.ksjs.sjsu.edu:8000/live',
    logo: '/logos/ksjs.png',
    genre: 'Student Run 24/7 Ground Zero'
  },
  {
    id: 'kpfa',
    name: 'KPFA',
    streamUrl: 'http://streams.kpfa.org:8000/kpfa_128',
    logo: '/logos/kpfa.png',
    genre: 'Vigilant as Always'
  },
  {
    id: 'wrir',
    name: 'WRIR',
    streamUrl: 'http://files.wrir.org:8000/WRIR96kbps',
    logo: '/logos/wrir.png',
    genre: 'Richmond Independent Radio'
  },
  {
    id: 'wayo',
    name: 'WAYO',
    streamUrl: 'http://streaming.wayofm.org:8000/wayo-192',
    logo: '/logos/wayo.png',
    genre: 'Way Out, Right Here'
  },
  {
    id: 'khol',
    name: 'KHOL',
    streamUrl: 'http://peridot.streamguys.com:6010/live',
    logo: '/logos/khol.png',
    genre: 'Jackson Hole Community Radio'
  },
  {
    id: 'khum',
    name: 'KHUM',
    streamUrl: 'http://lostcoast.streamguys.us/khum-hi',
    logo: '/logos/khum.png',
    genre: 'Freeform • Humboldt County'
  },
  {
    id: 'kups',
    name: 'KUPS',
    streamUrl: 'https://streamingv2.shoutcast.com/kupsfm',
    logo: '/logos/kups.png',
    genre: 'The Sound'
  },
  {
    id: 'wras',
    name: 'WRAS',
    streamUrl: 'https://gpb.streamguys1.com/gpb-atlanta-aac-website',
    logo: '/logos/wras.png',
    genre: 'Album 88 • Georgia State'
  },
  {
    id: 'kuci',
    name: 'KUCI',
    streamUrl: 'https://streamer.kuci.org:8088/web',
    logo: '/logos/kuci.png',
    genre: 'KUCI 88.9 FM • UC Irvine'
  },
  {
    id: 'citr',
    name: 'CiTR',
    streamUrl: 'http://live.citr.ca:8000/stream.mp3',
    logo: '/logos/citr.png',
    genre: 'U of British Columbia'
  },
  {
    id: 'wzbc',
    name: 'WZBC',
    streamUrl: 'https://stream.wzbc.org/wzbc',
    logo: '/logos/wzbc.png',
    genre: 'Boston College'
  },
  {
    id: 'kmrd',
    name: 'KMRD-LP',
    streamUrl: 'https://kmrd.broadcasttool.stream/listen.m3u',
    logo: '/logos/kmrd.png',
    genre: 'Madrid Community Radio'
  },

  // ---------------------------------------------------------------------
  // Recovered from soundtap.com (defunct) via the Internet Archive, then
  // matched against Radio Browser for current stream URLs. Every entry below
  // matched by name AND by position (within 150km of SoundTap's recorded
  // coordinates), and returned audio bytes when checked on 2026-07-31.
  // See data/soundtap-stations.json and scripts/.
  // No logo field: StationGrid draws a notation mark derived from the name.
  // ---------------------------------------------------------------------
  {
    id: '1431am',
    name: '1431AM',
    streamUrl: 'https://www.1431am.org:8001/1431high',
    logo: '/logos/1431am.png',
    genre: 'Thessaloniki, Greece'
  },
  {
    id: '4zzz',
    name: '4ZZZ',
    streamUrl: 'https://iheart.4zzz.org.au/4zzz',
    logo: '/logos/4zzz.svg',
    genre: 'Brisbane • Australia'
  },
  {
    id: 'cfru',
    name: 'CFRU',
    streamUrl: 'https://listen.cfru.ca/',
    logo: '/logos/cfru.png',
    genre: 'Canada'
  },
  {
    id: 'chirp2',
    name: 'CHIRP',
    streamUrl: 'https://peridot.streamguys1.com:5185/live',
    logo: '/logos/chirp2.png',
    genre: 'Independent Radio • USA'
  },
  {
    id: 'cixx',
    name: 'CIXX',
    streamUrl: 'https://ice23.securenetsystems.net/CIXXFM',
    logo: '/logos/cixx.png',
    genre: 'Campus Radio • Canada'
  },
  {
    id: 'cjsf',
    name: 'CJSF',
    streamUrl: 'https://www.cjsf.ca/streaming',
    logo: '/logos/cjsf.png',
    genre: 'College Radio • Canada'
  },
  {
    id: 'cjsw',
    name: 'CJSW',
    streamUrl: 'http://stream.cjsw.com/cjsw.mp3',
    logo: '/logos/cjsw.png',
    genre: 'Campus Radio • Canada'
  },
  {
    id: 'ckcu',
    name: 'CKCU',
    streamUrl: 'https://stream2.statsradio.com:8124/stream',
    logo: '/logos/ckcu.jpg',
    genre: 'College Radio • Canada'
  },
  {
    id: 'ckms',
    name: 'CKMS',
    streamUrl: 'https://radiowaterloo.ca/stream2',
    logo: '/logos/ckms.png',
    genre: 'Community Radio • Canada'
  },
  {
    id: 'infowars',
    name: 'InfoWars',
    streamUrl: 'http://stream-mp3.infowars.com/',
    logo: '/logos/infowars.jpg',
    genre: 'USA'
  },
  {
    id: 'kcsu',
    name: 'KCSU',
    streamUrl: 'https://listen.kcsufm.com/stream?nocache=1770828530774',
    logo: '/logos/kcsu.png',
    genre: 'University Radio • USA'
  },
  {
    id: 'kdfc',
    name: 'KDFC',
    streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KDFCFMAAC.aac',
    logo: '/logos/kdfc.png',
    genre: 'The United States Minor Outlying Islands'
  },
  {
    id: 'kexp',
    name: 'KEXP',
    streamUrl: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3',
    logo: '/logos/kexp.png',
    genre: 'USA'
  },
  {
    id: 'kgnu',
    name: 'KGNU',
    streamUrl: 'https://kgnu.streamguys1.com/kgnu',
    logo: '/logos/kgnu.png',
    genre: 'Community Radio • USA'
  },
  {
    id: 'khsu',
    name: 'KHSU',
    streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KHSUFM.mp3',
    logo: '/logos/khsu.webp',
    genre: 'Variety • USA'
  },
  {
    id: 'kmrd2',
    name: 'KMRD',
    streamUrl: 'https://kmrd.broadcasttool.stream/listen',
    logo: '/logos/kmrd2.png',
    genre: 'Community Radio • USA'
  },
  {
    id: 'kntu',
    name: 'KNTU',
    streamUrl: 'https://ice41.securenetsystems.net/KNTU',
    logo: '/logos/kntu.png',
    genre: 'Alternative • USA'
  },
  {
    id: 'kpov',
    name: 'KPOV',
    streamUrl: 'https://kpov-ice.streamguys1.com/live',
    logo: '/logos/kpov.png',
    genre: 'USA'
  },
  {
    id: 'kqed',
    name: 'KQED',
    streamUrl: 'https://hls.kqed.org/hls/kqed_app/playlist.m3u8',
    logo: '/logos/kqed.png',
    genre: 'Cultural News • USA'
  },
  {
    id: 'krcc',
    name: 'KRCC',
    streamUrl: 'https://streams.krcc.org/krcc_mp3',
    logo: '/logos/krcc.ico',
    genre: 'Local News • USA'
  },
  {
    id: 'krnu',
    name: 'KRNU',
    streamUrl: 'https://s8.yesstreaming.net:17004/krnu',
    logo: '/logos/krnu.png',
    genre: 'Alternative • USA'
  },
  {
    id: 'ksdp',
    name: 'KSDP',
    streamUrl: 'https://stream.apradio.org/stream.aac',
    logo: '/logos/ksdp.png',
    genre: 'Community Radio • USA'
  },
  {
    id: 'ksdt',
    name: 'KSDT',
    streamUrl: 'https://s4.radio.co/s2c33c7adb/listen',
    genre: 'College Radio • USA'
  },
  {
    id: 'ktcu',
    name: 'KTCU',
    streamUrl: 'https://ktcustream.tcu.edu/',
    logo: '/logos/ktcu.png',
    genre: 'College • USA'
  },
  {
    id: 'kunm',
    name: 'KUNM',
    streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KUNMFM_128.mp3',
    logo: '/logos/kunm.png',
    genre: 'USA'
  },
  {
    id: 'kvmr',
    name: 'KVMR',
    streamUrl: 'http://live.kvmr.org:8000/aac96',
    logo: '/logos/kvmr.png',
    genre: 'Comunity • USA'
  },
  {
    id: 'kzmu',
    name: 'KZMU',
    streamUrl: 'https://kzmu.streamguys1.com/live',
    genre: 'USA'
  },
  {
    id: 'luxuriamusic',
    name: 'Luxuria Music',
    streamUrl: 'http://ice10.securenetsystems.net/LUXOMP3',
    logo: '/logos/luxuriamusic.png',
    genre: 'Electronic • USA'
  },
  {
    id: 'radiodio',
    name: 'Radio Dio',
    streamUrl: 'https://live.aurafm.org/RadioDio',
    logo: '/logos/radiodio.ico',
    genre: 'Dub • France'
  },
  {
    id: 'radionova',
    name: 'Radio Nova',
    streamUrl: 'https://novazz.ice.infomaniak.ch/novazz-128.mp3',
    logo: '/logos/radionova.png',
    genre: 'France'
  },
  {
    id: 'radioone91fm',
    name: 'Radio One 91FM',
    streamUrl: 'https://play.r1.co.nz/live',
    logo: '/logos/radioone91fm.png',
    genre: 'Community Radio • New Zealand'
  },
  {
    id: 'radiok',
    name: 'RadioK',
    streamUrl: 'https://radiok.broadcasttool.stream/play_256',
    logo: '/logos/radiok.gif',
    genre: 'Campus • USA'
  },
  {
    id: 'radiostadmontfoort',
    name: 'RadioStadMontfoort',
    streamUrl: 'http://stream001.digiplay.nl:9038/stream',
    logo: '/logos/radiostadmontfoort.png',
    genre: '24/7 • Netherlands'
  },
  {
    id: 'radyoeksen',
    name: 'Radyo Eksen',
    streamUrl: 'https://dygedge.radyotvonline.net/radyoeksen/playlist.m3u8',
    logo: '/logos/radyoeksen.png',
    genre: 'Alternative • Türkiye'
  },
  {
    id: 'sohoradio',
    name: 'Soho Radio',
    streamUrl: 'http://sohoradiomusic.doughunt.co.uk:8000/320mp3',
    logo: '/logos/sohoradio.jpg',
    genre: 'Culture • UK'
  },
  {
    id: 'thelotradio',
    name: 'The Lot Radio',
    streamUrl: 'https://livepeercdn.studio/hls/85c28sa2o8wppm58/index.m3u8',
    logo: '/logos/thelotradio.png',
    genre: 'Dance • USA'
  },
  {
    id: 'wber',
    name: 'WBER',
    streamUrl: 'https://radio.monroe.edu/wber.mp3',
    genre: 'Alternative Rock • USA'
  },
  {
    id: 'wbny',
    name: 'WBNY',
    streamUrl: 'http://136.183.9.38:3307/;',
    logo: '/logos/wbny.png',
    genre: 'College Radio • USA'
  },
  {
    id: 'wbor',
    name: 'WBOR',
    streamUrl: 'https://listen.wbor.org/',
    logo: '/logos/wbor.png',
    genre: 'College • USA'
  },
  {
    id: 'wcdb',
    name: 'WCDB',
    streamUrl: 'https://streams.wcdb.fm/stream',
    logo: '/logos/wcdb.jpg',
    genre: '24/7 • USA'
  },
  {
    id: 'wchc',
    name: 'WCHC',
    streamUrl: 'https://s2.radio.co/sc161fe4c9/listen',
    logo: '/logos/wchc.png',
    genre: 'Alternative • USA'
  },
  {
    id: 'wcuw',
    name: 'WCUW',
    streamUrl: 'http://peridot.streamguys.com:5490/live',
    logo: '/logos/wcuw.png',
    genre: 'Americana • USA'
  },
  {
    id: 'wdbm',
    name: 'WDBM',
    streamUrl: 'https://play.impact89fm.org:8000/impact89fm',
    logo: '/logos/wdbm.png',
    genre: 'Alternative • USA'
  },
  {
    id: 'weft',
    name: 'WEFT',
    streamUrl: 'https://weft.broadcasttool.stream/stream',
    logo: '/logos/weft.jpg',
    genre: 'USA'
  },
  {
    id: 'wers',
    name: 'WERS',
    streamUrl: 'http://marconi.emerson.edu:8000/wers',
    logo: '/logos/wers.png',
    genre: 'Alternative • USA'
  },
  {
    id: 'wfuv',
    name: 'WFUV',
    streamUrl: 'https://onair.wfuv.org/onair-aacplus',
    logo: '/logos/wfuv.ico',
    genre: 'Adult Album Alternative • USA'
  },
  {
    id: 'whrv',
    name: 'WHRV',
    streamUrl: 'http://whrv.mediaplayer.whro.org/128',
    logo: '/logos/whrv.png',
    genre: 'Jazz • USA'
  },
  {
    id: 'whrw',
    name: 'WHRW',
    streamUrl: 'http://stream.whrwfm.org/new',
    logo: '/logos/whrw.png',
    genre: 'Classical • USA'
  },
  {
    id: 'widr',
    name: 'WIDR',
    streamUrl: 'http://widrfm.net/stream',
    logo: '/logos/widr.png',
    genre: 'USA'
  },
  {
    id: 'witr',
    name: 'WITR',
    streamUrl: 'https://streaming.witr.rit.edu/live-aac-96',
    logo: '/logos/witr.jpg',
    genre: 'College Radio • USA'
  },
  {
    id: 'wluw2',
    name: 'WLUW',
    streamUrl: 'https://ice26.securenetsystems.net/WLUW?playSessionID=AD47E8CB-E610-56AC-09E96DB77F17E09B',
    logo: '/logos/wluw2.webp',
    genre: 'Independent Radio • USA'
  },
  {
    id: 'wmnf',
    name: 'WMNF',
    streamUrl: 'https://stream.wmnf.org/wmnf_high_quality',
    logo: '/logos/wmnf.png',
    genre: 'Community Radio • USA'
  },
  {
    id: 'wmtu',
    name: 'WMTU',
    streamUrl: 'https://stream.wmtu.fm/wmtu-live',
    logo: '/logos/wmtu.webp',
    genre: 'USA'
  },
  {
    id: 'wnyc',
    name: 'WNYC',
    streamUrl: 'http://fm939.wnyc.org/wnycfm.aac',
    logo: '/logos/wnyc.png',
    genre: 'News • USA'
  },
  {
    id: 'worldmusicradio',
    name: 'World Music Radio',
    streamUrl: 'http://stream.wlmm.dk:8010/wmrmp3',
    logo: '/logos/worldmusicradio.png',
    genre: 'Denmark'
  },
  {
    id: 'wort',
    name: 'WORT',
    streamUrl: 'https://stream.wortfm.org:8443/high.mp3',
    logo: '/logos/wort.png',
    genre: 'USA'
  },
  {
    id: 'wprk',
    name: 'WPRK',
    streamUrl: 'https://wprk.broadcasttool.stream:80/stream',
    logo: '/logos/wprk.png',
    genre: 'USA'
  },
  {
    id: 'wpts',
    name: 'WPTS',
    streamUrl: 'http://audio.wpts.pitt.edu:8000/wpts_live_128s.mp3',
    logo: '/logos/wpts.png',
    genre: 'Alternative • USA'
  },
  {
    id: 'wrbb',
    name: 'WRBB',
    streamUrl: 'https://audio-edge-qse4n.yyz.g.radiomast.io/dafd1179-5404-4939-9c1c-a014c6964254',
    logo: '/logos/wrbb.png',
    genre: 'College Radio • USA'
  },
  {
    id: 'wrct',
    name: 'WRCT',
    streamUrl: 'http://stream.wrct.org/wrct-hi.mp3',
    logo: '/logos/wrct.png',
    genre: 'Freeform • USA'
  },
  {
    id: 'wrpi',
    name: 'WRPI',
    streamUrl: 'https://stream.wrpi.org/mp3-320.mp3',
    logo: '/logos/wrpi.png',
    genre: 'College • USA'
  },
  {
    id: 'wruw',
    name: 'WRUW',
    streamUrl: 'https://wruw-stream.wruw.org/hls/stream.m3u8',
    logo: '/logos/wruw.ico',
    genre: 'Alternative • USA'
  },
  {
    id: 'wsoe',
    name: 'WSOE',
    streamUrl: 'https://audio-mp3.ibiblio.org/wsoe.mp3',
    logo: '/logos/wsoe.webp',
    genre: 'Alternative • USA'
  },
  {
    id: 'wtip',
    name: 'WTIP',
    streamUrl: 'https://wtip.broadcasttool.stream/stream',
    logo: '/logos/wtip.png',
    genre: 'Community Radio • USA'
  },
  {
    id: 'wumm',
    name: 'WUMM',
    streamUrl: 'http://wumm.machias.edu:8000/wumm',
    logo: '/logos/wumm.png',
    genre: 'University • USA'
  },
  {
    id: 'wvbr',
    name: 'WVBR',
    streamUrl: 'https://ais-edge07-live365-dal02.cdnstream.com/a25496',
    logo: '/logos/wvbr.ico',
    genre: 'College Radio • USA'
  },
  {
    id: 'wvkr',
    name: 'WVKR',
    streamUrl: 'https://26733.live.streamtheworld.com/WVKRFM.mp3',
    genre: 'College • USA'
  },
  {
    id: 'wvud',
    name: 'WVUD',
    streamUrl: 'http://142.44.160.109/s1bc6bf517/listen',
    logo: '/logos/wvud.png',
    genre: 'USA'
  },
  {
    id: 'wxdu',
    name: 'WXDU',
    streamUrl: 'http://152.3.0.231:8000/wxdu128.mp3',
    logo: '/logos/wxdu.ico',
    genre: 'Duke • USA'
  },
  {
    id: 'wxou',
    name: 'WXOU',
    streamUrl: 'https://a8.asurahosting.com/listen/wxou/radio.mp3',
    logo: '/logos/wxou.png',
    genre: 'College Radio • USA'
  },
  {
    id: 'wxox',
    name: 'WXOX',
    streamUrl: 'https://patmos.cdnstream.com/proxy/artfmin1/?mp=/stream',
    logo: '/logos/wxox.jpg',
    genre: 'Variety • USA'
  },
  {
    id: 'wxyc',
    name: 'WXYC',
    streamUrl: 'https://audio-mp3.ibiblio.org/wxyc.mp3',
    logo: '/logos/wxyc.png',
    genre: 'Freeform • USA'
  },
  {
    id: 'wysu',
    name: 'WYSU',
    streamUrl: 'https://live.streamguys1.com:3181/hd2',
    genre: 'Classical • USA'
  },

  // ---------------------------------------------------------------------
  // Medium-confidence SoundTap matches. Radio Browser holds no coordinates
  // for these, so the 150km position check that validated the block above
  // was unavailable. Three substitutes were required instead: an exact name
  // match, a stream that returned audio bytes, and station artwork that
  // downloaded and decoded as a real image. Country was cross-checked by
  // inferring each one from SoundTap's coordinates - that step caught four
  // wrong matches (ExpressFM, Radio Valencia, Radio 90.5fm, Radio Caroline)
  // which are excluded, along with three name-containment guesses.
  // Artwork is served locally: the kiosk must render with no network.
  // ---------------------------------------------------------------------
  {
    id: 'bagelradio',
    name: 'Bagel Radio',
    streamUrl: 'https://ais-sa3.cdnstream1.com/2606_128.aac',
    logo: '/logos/bagelradio.jpg',
    genre: 'USA'
  },
  {
    id: 'bailriggfm',
    name: 'Bailrigg FM',
    streamUrl: 'https://stream.bailriggfm.co.uk/listen/bfm/128.mp3',
    logo: '/logos/bailriggfm.png',
    genre: 'UK'
  },
  {
    id: 'bfffm',
    name: 'BFF.fm',
    streamUrl: 'http://stream.bff.fm/1/BFF.fm.mp3',
    logo: '/logos/bfffm.png',
    genre: 'USA'
  },
  {
    id: 'bushradio',
    name: 'Bushradio',
    streamUrl: 'https://zas4.ndx.co.za:9100/stream',
    logo: '/logos/bushradio.png',
    genre: 'South Africa'
  },
  {
    id: 'coyoteradio',
    name: 'Coyote Radio',
    streamUrl: 'https://crbroadcast.csusb.edu/cr_live',
    logo: '/logos/coyoteradio.png',
    genre: 'USA'
  },
  {
    id: 'dublindigitalradio',
    name: 'Dublin Digital Radio',
    streamUrl: 'https://dublin-digital-radio.radiocult.fm/stream',
    logo: '/logos/dublindigitalradio.jpg',
    genre: 'Ireland'
  },
  {
    id: 'lemellotron',
    name: 'LeMellotron',
    streamUrl: 'https://listen.radioking.com/radio/477719/stream/534044',
    logo: '/logos/lemellotron.png',
    genre: 'France'
  },
  {
    id: 'nessradio',
    name: 'Ness Radio',
    streamUrl: 'https://radio.nessradio.net:8212/nessradio-hd',
    logo: '/logos/nessradio.jpg',
    genre: 'Morocco'
  },
  {
    id: 'newtownradio',
    name: 'Newtown Radio',
    streamUrl: 'https://streaming.radio.co/s0d090ee43/listen',
    logo: '/logos/newtownradio.ico',
    genre: 'USA'
  },
  {
    id: 'radio6023',
    name: 'Radio 6023',
    streamUrl: 'http://stream12.top-ix.org/radio6023',
    logo: '/logos/radio6023.jpg',
    genre: 'Italy'
  },
  {
    id: 'radioactive2',
    name: 'Radio Active',
    streamUrl: 'https://streamyourdream.org:8050/radioactive',
    logo: '/logos/radioactive2.png',
    genre: 'Greece'
  },
  {
    id: 'radiocampuslille',
    name: 'Radio Campus Lille',
    streamUrl: 'http://radiocampuslille.ice.infomaniak.ch/radiocampuslille-96.aac',
    logo: '/logos/radiocampuslille.png',
    genre: 'France'
  },
  {
    id: 'radiocentraal',
    name: 'Radio Centraal',
    streamUrl: 'http://streams.movemedia.eu/centraal',
    logo: '/logos/radiocentraal.ico',
    genre: 'Belgium'
  },
  {
    id: 'radioparadise',
    name: 'Radio Paradise',
    streamUrl: 'http://stream.radioparadise.com/flac',
    logo: '/logos/radioparadise.png',
    genre: 'Community radio'
  },
  {
    id: 'rtrfm',
    name: 'RTRfm',
    streamUrl: 'https://live.rtrfm.com.au/stream1',
    logo: '/logos/rtrfm.webp',
    genre: 'Australia'
  },
  {
    id: 'uclaradio',
    name: 'UCLAradio',
    streamUrl: 'https://live.uclaradio.com/listen/ucla_radio/radio.mp3',
    logo: '/logos/uclaradio.png',
    genre: 'USA'
  },
  {
    id: 'wbcrlp',
    name: 'WBCR-lp',
    streamUrl: 'https://s3.citrus3.com:8114/stream',
    logo: '/logos/wbcrlp.png',
    genre: 'USA'
  },
  {
    id: 'xrayfm',
    name: 'XRAY FM',
    streamUrl: 'https://listen.xray.fm/stream',
    logo: '/logos/xrayfm.png',
    genre: 'USA'
  },
  {
    id: 'ynotradio',
    name: 'YNOT Radio',
    streamUrl: 'https://ais-edge104-live365-dal02.cdnstream.com/a54553',
    logo: '/logos/ynotradio.ico',
    genre: 'USA'
  },
];

export function RadioProvider({ children }) {
  const [stations] = useState(DEFAULT_STATIONS);
  const [currentStation, setCurrentStation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [metadata, setMetadata] = useState({ artist: '', title: '', artwork: null });
  const [volume, setVolume] = useState(1.0);
  const [activeTab, setActiveTab] = useState('radio');
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  const audioRef = useRef(null);
  const wsRef = useRef(null);
  const screensaverTimeoutRef = useRef(null);

  // Screensaver timeout (1 hour = 3600000ms)
  const SCREENSAVER_TIMEOUT = 60 * 60 * 1000;

  // Reset activity timer
  const resetActivity = useCallback(() => {
    setLastActivityTime(Date.now());
    setShowScreensaver(false);
  }, []);

  // Check for inactivity and show screensaver
  useEffect(() => {
    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;

      // Show screensaver if not playing and inactive for timeout period
      if (!isPlaying && timeSinceActivity >= SCREENSAVER_TIMEOUT) {
        setShowScreensaver(true);
      }
    };

    // Check every minute
    const interval = setInterval(checkInactivity, 60000);

    // Also check immediately when isPlaying changes
    if (isPlaying) {
      setShowScreensaver(false);
      setLastActivityTime(Date.now());
    }

    return () => clearInterval(interval);
  }, [isPlaying, lastActivityTime]);

  // Dismiss screensaver handler
  const dismissScreensaver = useCallback(() => {
    setShowScreensaver(false);
    setLastActivityTime(Date.now());
  }, []);

  // Manually trigger screensaver
  const triggerScreensaver = useCallback(() => {
    setShowScreensaver(true);
  }, []);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    // Define handlers so we can remove them on cleanup
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      // Properly remove event listeners to prevent memory leaks
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // WebSocket connection for metadata with exponential backoff
  useEffect(() => {
    let reconnectAttempts = 0;
    let reconnectTimeout = null;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.DEV ? 'localhost:3001' : window.location.host;
      const wsUrl = `${protocol}//${host}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0; // Reset on successful connection
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'metadata') {
            setMetadata({
              artist: data.artist || '',
              title: data.title || '',
              artwork: data.artwork || null
            });
          } else if (data.type === 'state' && data.metadata) {
            setMetadata(data.metadata);
          } else if (data.type === 'radio-command') {
            // Handle remote radio commands
            if (data.action === 'play' && data.stationId) {
              const station = DEFAULT_STATIONS.find(s => s.id === data.stationId);
              if (station && audioRef.current) {
                console.log('Remote command: playing station', station.name);
                audioRef.current.pause();
                audioRef.current.src = station.streamUrl;
                audioRef.current.play().catch(e => console.error('Play error:', e));
                setCurrentStation(station);
                setMetadata({ artist: '', title: '', artwork: null });
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'play', streamUrl: station.streamUrl }));
                }
              }
            } else if (data.action === 'stop') {
              console.log('Remote command: stopping playback');
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
              }
              setCurrentStation(null);
              setIsPlaying(false);
              setMetadata({ artist: '', title: '', artwork: null });
            }
          } else if (data.type === 'switch-tab') {
            // Handle remote tab switching
            console.log('Remote command: switching to tab', data.tab);
            if (data.tab && ['radio', 'spotify', 'mixcloud'].includes(data.tab)) {
              setActiveTab(data.tab);
            }
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      };

      wsRef.current.onclose = () => {
        if (isUnmounted) return;
        // Exponential backoff: 3s, 6s, 12s, 24s, max 60s
        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), 60000);
        reconnectAttempts++;
        console.log(`WebSocket closed, reconnecting in ${delay / 1000}s...`);
        reconnectTimeout = setTimeout(connectWebSocket, delay);
      };

      wsRef.current.onerror = (e) => {
        console.error('WebSocket error:', e);
      };
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playStation = useCallback(async (station) => {
    if (!audioRef.current) return;

    // Pause Spotify before playing radio
    try {
      await fetch('/api/spotify/pause', { method: 'PUT' });
    } catch (e) {
      console.log('Could not pause Spotify:', e);
    }

    audioRef.current.pause();
    audioRef.current.src = station.streamUrl;
    audioRef.current.play().catch(e => console.error('Play error:', e));
    
    setCurrentStation(station);
    setMetadata({ artist: '', title: '', artwork: null });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'play', streamUrl: station.streamUrl }));
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentStation(null);
    setIsPlaying(false);
    setMetadata({ artist: '', title: '', artwork: null });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else if (currentStation) {
      audioRef.current.play().catch(e => console.error('Play error:', e));
    }
  }, [isPlaying, currentStation]);

  const nextStation = useCallback(() => {
    if (!currentStation) {
      playStation(stations[0]);
      return;
    }
    const idx = stations.findIndex(s => s.id === currentStation.id);
    const nextIdx = (idx + 1) % stations.length;
    playStation(stations[nextIdx]);
  }, [currentStation, stations, playStation]);

  const prevStation = useCallback(() => {
    if (!currentStation) {
      playStation(stations[stations.length - 1]);
      return;
    }
    const idx = stations.findIndex(s => s.id === currentStation.id);
    const prevIdx = (idx - 1 + stations.length) % stations.length;
    playStation(stations[prevIdx]);
  }, [currentStation, stations, playStation]);

  const value = {
    stations,
    currentStation,
    isPlaying,
    metadata,
    volume,
    activeTab,
    showScreensaver,
    setVolume,
    setActiveTab,
    playStation,
    stop,
    togglePlay,
    nextStation,
    prevStation,
    dismissScreensaver,
    resetActivity,
    triggerScreensaver
  };

  return (
    <RadioContext.Provider value={value}>
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error('useRadio must be used within a RadioProvider');
  }
  return context;
}
