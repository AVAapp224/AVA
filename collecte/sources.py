"""Les médias suivis par l'app et leurs flux officiels.

Chaque source : identifiant, nom affiché, pays, langue, liste de (adresse du flux, thème suggéré ou None).
Les thèmes suggérés viennent des rubriques des journaux ; l'algorithme les complète par mots-clés.
"""

LM = 'https://www.lemonde.fr/{}/rss_full.xml'
FIG = 'https://www.lefigaro.fr/rss/figaro_{}.xml'
FTV = 'https://www.francetvinfo.fr/{}.rss'
GU = 'https://www.theguardian.com/{}/rss'
NYT = 'https://rss.nytimes.com/services/xml/rss/nyt/{}.xml'
BBC = 'http://feeds.bbci.co.uk/news/{}rss.xml'

SOURCES = [
    # ---------- France ----------
    ('lemonde', 'Le Monde', 'fr', 'fr', [
        ('https://www.lemonde.fr/rss/une.xml', None),
        (LM.format('international'), None), (LM.format('politique'), 'politique'),
        (LM.format('economie'), 'bourse'), (LM.format('bourse'), 'bourse'), (LM.format('argent'), 'bourse'),
        (LM.format('sport'), 'sport'), (LM.format('tennis'), 'sport'),
        (LM.format('culture'), 'culture'), (LM.format('cinema'), 'pop'), (LM.format('musiques'), 'pop'),
        (LM.format('planete'), 'environnement'), (LM.format('climat'), 'environnement'),
        (LM.format('sciences'), 'tech'), (LM.format('pixels'), 'tech~'),
        (LM.format('m-styles'), None), (LM.format('m-mode'), 'mode'),
        (LM.format('societe'), 'societe'), (LM.format('education'), 'societe'),
        (LM.format('sante'), 'sante'), (LM.format('afrique'), None),
        (LM.format('voyage'), 'voyage'), (LM.format('gastronomie'), 'gastronomie'),
    ]),
    ('lefigaro', 'Le Figaro', 'fr', 'fr', [
        (FIG.format('actualites'), None), (FIG.format('economie'), 'bourse'), (FIG.format('sport'), 'sport'),
        (FIG.format('culture'), 'culture'), (FIG.format('politique'), 'politique'),
        (FIG.format('sciences'), 'tech'), (FIG.format('sante'), 'sante'), (FIG.format('voyages'), 'voyage'),
    ]),
    ('liberation', 'Libération', 'fr', 'fr', [('https://www.liberation.fr/arc/outboundfeeds/rss-all/collection/accueil-une/?outputType=xml', None)]),
    ('leparisien', 'Le Parisien', 'fr', 'fr', [('https://feeds.leparisien.fr/leparisien/rss', None)]),
    ('ouestfrance', 'Ouest-France', 'fr', 'fr', [('https://www.ouest-france.fr/rss/une', None)]),
    ('20minutes', '20 Minutes', 'fr', 'fr', [('https://www.20minutes.fr/feeds/rss-une.xml', None), ('https://www.20minutes.fr/feeds/rss-voyage.xml', 'voyage')]),
    ('lacroix', 'La Croix', 'fr', 'fr', [('https://www.la-croix.com/RSS/UNIVERS', None)]),
    ('humanite', "L'Humanité", 'fr', 'fr', [('https://www.humanite.fr/feed', None)]),
    ('franceinfo', 'France Info', 'fr', 'fr', [
        ('https://www.francetvinfo.fr/titres.rss', None), (FTV.format('monde'), None),
        (FTV.format('economie'), 'bourse'), (FTV.format('sports'), 'sport'), (FTV.format('culture'), 'culture'),
        (FTV.format('politique'), 'politique'), (FTV.format('sante'), 'sante'), (FTV.format('sciences'), 'tech'),
        (FTV.format('societe'), 'societe'), (FTV.format('internet'), 'tech'), ('https://www.francetvinfo.fr/culture/mode.rss', 'mode'),
    ]),
    ('france24', 'France 24', 'intl', 'fr', [('https://www.france24.com/fr/rss', None)]),
    ('rfi', 'RFI', 'intl', 'fr', [('https://www.rfi.fr/fr/rss', None), ('https://www.rfi.fr/fr/afrique/rss', None)]),
    ('courrierinter', 'Courrier international', 'fr', 'fr', [('https://www.courrierinternational.com/feed/all/rss.xml', None)]),
    ('lexpress', "L'Express", 'fr', 'fr', [('https://www.lexpress.fr/arc/outboundfeeds/rss/alaune.xml', None)]),
    ('lobs', "L'Obs", 'fr', 'fr', [('https://www.nouvelobs.com/a-la-une/rss.xml', None)]),
    ('mediapart', 'Mediapart', 'fr', 'fr', [('https://www.mediapart.fr/articles/feed', None)]),
    ('lequipe', "L'Équipe", 'fr', 'fr', [('https://dwh.lequipe.fr/api/edito/rss?path=/', 'sport')]),
    ('voguefr', 'Vogue France', 'fr', 'fr', [('https://www.vogue.fr/feed/rss', 'mode')]),
    ('tv5monde', 'TV5Monde', 'intl', 'fr', [('https://information.tv5monde.com/rss.xml', None)]),

    # ---------- Royaume-Uni ----------
    ('bbc', 'BBC News', 'uk', 'en', [
        (BBC.format(''), None), (BBC.format('world/'), None), (BBC.format('business/'), 'bourse'),
        (BBC.format('technology/'), 'tech'), (BBC.format('science_and_environment/'), 'environnement'),
        (BBC.format('entertainment_and_arts/'), 'pop'), (BBC.format('health/'), 'sante'),
    ]),
    ('guardian', 'The Guardian', 'uk', 'en', [
        (GU.format('world'), None), (GU.format('business'), 'bourse'), (GU.format('sport'), 'sport'),
        (GU.format('culture'), 'culture'), (GU.format('environment'), 'environnement'), (GU.format('politics'), 'politique'),
        (GU.format('technology'), 'tech'), (GU.format('travel'), 'voyage'), (GU.format('fashion'), 'mode'),
        (GU.format('food'), 'gastronomie'), (GU.format('society'), 'societe'),
    ]),
    ('ft', 'Financial Times', 'uk', 'en', [('https://www.ft.com/rss/home', 'bourse')]),
    ('independent', 'The Independent', 'uk', 'en', [('https://www.independent.co.uk/news/world/rss', None)]),
    ('economist', 'The Economist', 'uk', 'en', [('https://www.economist.com/latest/rss.xml', None)]),
    ('skynews', 'Sky News', 'uk', 'en', [('https://feeds.skynews.com/feeds/rss/home.xml', None)]),
    ('inews', 'i (inews)', 'uk', 'en', [('https://inews.co.uk/feed', None)]),

    # ---------- États-Unis ----------
    ('nyt', 'The New York Times', 'us', 'en', [
        (NYT.format('HomePage'), None), (NYT.format('World'), None), (NYT.format('Business'), 'bourse'),
        (NYT.format('Arts'), 'culture'), (NYT.format('Climate'), 'environnement'), (NYT.format('Politics'), 'politique'),
        (NYT.format('Technology'), 'tech'), (NYT.format('Travel'), 'voyage'), (NYT.format('FashionandStyle'), 'mode'),
        (NYT.format('DiningandWine'), 'gastronomie'), (NYT.format('Health'), 'sante'), (NYT.format('Science'), 'tech'),
    ]),
    ('wapo', 'The Washington Post', 'us', 'en', [('https://feeds.washingtonpost.com/rss/world', None)]),
    ('wsj', 'The Wall Street Journal', 'us', 'en', [('https://feeds.a.dj.com/rss/RSSWorldNews.xml', None), ('https://feeds.a.dj.com/rss/RSSMarketsMain.xml', 'bourse')]),
    ('npr', 'NPR', 'us', 'en', [('https://feeds.npr.org/1001/rss.xml', None)]),
    ('pbs', 'PBS NewsHour', 'us', 'en', [('https://www.pbs.org/newshour/feeds/rss/headlines', None)]),
    ('bloomberg', 'Bloomberg', 'us', 'en', [('https://feeds.bloomberg.com/markets/news.rss', 'bourse')]),
    ('politico', 'Politico', 'us', 'en', [('https://rss.politico.com/politics-news.xml', 'politique')]),
    ('axios', 'Axios', 'us', 'en', [('https://api.axios.com/feed/', None)]),
    ('latimes', 'Los Angeles Times', 'us', 'en', [('https://www.latimes.com/world-nation/rss2.0.xml', None)]),
    ('cntraveler', 'Condé Nast Traveler', 'us', 'en', [('https://www.cntraveler.com/feed/rss', 'voyage')]),
    ('vogue', 'Vogue', 'us', 'en', [('https://www.vogue.com/feed/rss', 'mode')]),
    ('atlantic', 'The Atlantic', 'us', 'en', [('https://www.theatlantic.com/feed/all/', None)]),

    # ---------- Canada ----------
    ('radiocanada', 'Radio-Canada', 'ca', 'fr', [
        ('https://ici.radio-canada.ca/rss/4159', None), ('https://ici.radio-canada.ca/rss/1000524', None),
        ('https://ici.radio-canada.ca/rss/5717', None), ('https://ici.radio-canada.ca/rss/1000057', None),
    ]),
    ('lapresse', 'La Presse', 'ca', 'fr', [
        ('https://www.lapresse.ca/actualites/rss', None), ('https://www.lapresse.ca/sports/rss', 'sport'),
        ('https://www.lapresse.ca/affaires/rss', 'bourse'), ('https://www.lapresse.ca/arts/rss', 'culture'),
        ('https://www.lapresse.ca/voyage/rss', 'voyage'),
    ]),
    ('ledevoir', 'Le Devoir', 'ca', 'fr', [('https://www.ledevoir.com/rss/manchettes.xml', None)]),
    ('jdm', 'Le Journal de Montréal', 'ca', 'fr', [('https://www.journaldemontreal.com/rss.xml', None)]),
    ('tva', 'TVA Nouvelles', 'ca', 'fr', [('https://www.tvanouvelles.ca/rss.xml', None)]),
    ('lesoleil', 'Le Soleil', 'ca', 'fr', [('https://www.lesoleil.com/arc/outboundfeeds/rss/?outputType=xml', None)]),
    ('lactualite', "L'actualité", 'ca', 'fr', [('https://lactualite.com/feed/', None)]),
    ('cbc', 'CBC News', 'ca', 'en', [('https://www.cbc.ca/webfeed/rss/rss-topstories', None)]),
    ('globe', 'The Globe and Mail', 'ca', 'en', [('https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/canada/', None)]),
    ('torontostar', 'Toronto Star', 'ca', 'en', [('https://www.thestar.com/search/?f=rss&t=article&c=news*&l=50&s=start_time&sd=desc', None)]),
    ('nationalpost', 'National Post', 'ca', 'en', [('https://nationalpost.com/feed', None)]),
    ('ctv', 'CTV News', 'ca', 'en', [('https://www.ctvnews.ca/arc/outboundfeeds/rss/?outputType=xml', None)]),
    ('globalnews', 'Global News', 'ca', 'en', [('https://globalnews.ca/feed/', None)]),

    # ---------- Autres pays ----------
    ('designboom', 'Designboom', 'intl', 'en', [('https://www.designboom.com/feed/', 'mode')]),
    ('dezeen', 'Dezeen', 'uk', 'en', [('https://www.dezeen.com/feed/', 'mode')]),
    ('rtbf', 'RTBF', 'be', 'fr', [('https://rss.rtbf.be/article/rss/highlight_rtbf_info.xml', None)]),
    ('lalibre', 'La Libre Belgique', 'be', 'fr', [('https://www.lalibre.be/arc/outboundfeeds/rss/?outputType=xml', None)]),
    ('letemps', 'Le Temps', 'ch', 'fr', [('https://www.letemps.ch/articles.rss', None)]),
    ('rts', 'RTS', 'ch', 'fr', [('https://www.rts.ch/info/?format=rss/news', None)]),
    ('euronews', 'Euronews', 'intl', 'fr', [('https://fr.euronews.com/rss', None)]),
    ('spiegel', 'Der Spiegel', 'de', 'en', [('https://www.spiegel.de/international/index.rss', None)]),
    ('elpais', 'El País', 'es', 'es', [('https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', None)]),
    ('corriere', 'Corriere della Sera', 'it', 'it', [('https://xml2.corriereobjects.it/rss/homepage.xml', None)]),
    ('jeuneafrique', 'Jeune Afrique', 'afr', 'fr', [('https://www.jeuneafrique.com/feed/', None)]),
    ('aljazeera', 'Al Jazeera', 'intl', 'en', [('https://www.aljazeera.com/xml/rss/all.xml', None)]),
    ('haaretz', 'Haaretz', 'il', 'en', [('https://www.haaretz.com/srv/haaretz-latest-headlines', None)]),
    ('japantimes', 'The Japan Times', 'jp', 'en', [('https://www.japantimes.co.jp/feed/', None)]),
    ('scmp', 'South China Morning Post', 'hk', 'en', [('https://www.scmp.com/rss/91/feed', None)]),
    ('straitstimes', 'The Straits Times', 'sg', 'en', [('https://www.straitstimes.com/news/world/rss.xml', None)]),
    ('thehindu', 'The Hindu', 'in', 'en', [('https://www.thehindu.com/news/international/feeder/default.rss', None)]),
    ('abcau', 'ABC News (Australie)', 'au', 'en', [('https://www.abc.net.au/news/feed/51120/rss.xml', None)]),
    ('smh', 'The Sydney Morning Herald', 'au', 'en', [('https://www.smh.com.au/rss/feed.xml', None)]),
    ('folha', 'Folha de S.Paulo', 'br', 'pt', [('https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', None)]),
    ('clarin', 'Clarín', 'ar', 'es', [('https://www.clarin.com/rss/lo-ultimo/', None)]),
]

# Médias de la liste dont le flux n'est pas accessible librement pour l'instant.
INDISPONIBLES = ['Les Échos', 'Le Point', 'The Telegraph', 'The Times', 'USA Today', "Maclean's", 'Le Soir',
                 'DW', "L'Orient-Le Jour", 'El Universal', 'TelQuel', 'The Times of Israel',
                 'CNN (flux public arrêté en 2023)', 'HugoDécrypte (YouTube)', 'Brut (YouTube)']

# Marchés et entreprises (cours via Yahoo Finance pour les tests ; à remplacer par une source sous licence au lancement).
MARCHES = [('^FCHI', 'CAC 40'), ('^GSPC', 'S&P 500'), ('^GSPTSE', 'TSX · Toronto'), ('BZ=F', 'Pétrole Brent'),
           ('EURUSD=X', 'Euro / Dollar'), ('GC=F', 'Or')]
SOCIETES = [('MC.PA', 'LVMH', 'Paris', ['lvmh', 'louis vuitton', 'bernard arnault']),
            ('SHOP.TO', 'Shopify', 'Toronto', ['shopify']),
            ('AI.PA', 'Air Liquide', 'Paris', ['air liquide']),
            ('AAPL', 'Apple', 'New York', ['apple', 'iphone']),
            ('TTE.PA', 'TotalEnergies', 'Paris', ['totalenergies', 'total energies']),
            ('RMS.PA', 'Hermès', 'Paris', ['hermes', 'hermès']),
            ('NA.TO', 'Banque Nationale', 'Toronto', ['banque nationale']),
            ('NVDA', 'Nvidia', 'New York', ['nvidia']),
            ('TSLA', 'Tesla', 'New York', ['tesla', 'elon musk']),
            ('MSFT', 'Microsoft', 'New York', ['microsoft']),
            ('OR.PA', "L'Oréal", 'Paris', ["l'oreal", 'loreal']),
            ('AIR.PA', 'Airbus', 'Paris', ['airbus']),
            ('RY.TO', 'Banque Royale', 'Toronto', ['banque royale', 'rbc']),
            ('AMZN', 'Amazon', 'New York', ['amazon'])]
