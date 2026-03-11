-- Press Releases Table
CREATE TABLE IF NOT EXISTS press_releases (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial data
INSERT INTO press_releases (id, title, content, created_at, updated_at)
VALUES (
    1,
    '年収550万円以上で即内定！技術×ビジネス思考を磨く27・28卒向けハッカソン受付開始',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"プレスリリース配信サービス「PR TIMES」等を運営する株式会社PR TIMES（東京都港区、代表取締役：山口拓己、東証プライム、名証プレミア：3922）は、2026年3月9日（月）、10日（火）、11日（水）の3日間、2027・28年卒業予定のエンジニア志望学生(*1)を対象とした「PR TIMES HACKATHON 2026 Spring」をPR TIMES本社（赤坂インターシティ）で開催します。"}]},{"type":"paragraph","content":[{"type":"text","text":"一次募集締切は2026年2月1日（日） 23:59まで、下記フォームより本日からエントリー受付を開始いたします。"}]}]}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    press_release_id INTEGER NOT NULL REFERENCES press_releases(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    comment_id VARCHAR(36) NOT NULL,
    body TEXT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert mock templates
INSERT INTO templates (id, name, title, content) VALUES
(1,
 '新サービスリリース',
 '【株式会社○○】新サービス「○○」を○月○日より提供開始',
 '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"概要"}]},{"type":"paragraph","content":[{"type":"text","text":"株式会社○○（本社：東京都○○区、代表取締役：○○）は、○年○月○日より新サービス「○○」の提供を開始いたします。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"背景"}]},{"type":"paragraph","content":[{"type":"text","text":"（サービス開発の背景・課題についてここに記載）"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"サービスの特徴"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"特徴1：○○"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"特徴2：○○"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"特徴3：○○"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"今後の展望"}]},{"type":"paragraph","content":[{"type":"text","text":"（今後の計画についてここに記載）"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"会社概要"}]},{"type":"paragraph","content":[{"type":"text","text":"会社名：株式会社○○\n所在地：東京都○○区○○\n代表者：代表取締役 ○○\n設立：○年○月\nURL：https://example.com"}]}]}'
),
(2,
 'イベント・セミナー告知',
 '【○月○日開催】○○セミナー「○○」参加者募集開始',
 '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"イベント概要"}]},{"type":"paragraph","content":[{"type":"text","text":"株式会社○○は、○年○月○日（○）に「○○」を開催いたします。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"開催概要"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"日時：○年○月○日（○） ○:○〜○:○"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"会場：○○（東京都○○区○○）"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"定員：○名"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"参加費：無料"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"申込方法：下記URLよりお申し込みください"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"プログラム"}]},{"type":"paragraph","content":[{"type":"text","text":"（タイムテーブルをここに記載）"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"登壇者"}]},{"type":"paragraph","content":[{"type":"text","text":"（登壇者情報をここに記載）"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"お問い合わせ"}]},{"type":"paragraph","content":[{"type":"text","text":"株式会社○○ 広報担当\nメール：pr@example.com\n電話：03-XXXX-XXXX"}]}]}'
),
(3,
 '業務提携・協業',
 '株式会社○○と株式会社△△、○○分野において業務提携を開始',
 '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"概要"}]},{"type":"paragraph","content":[{"type":"text","text":"株式会社○○（本社：東京都○○区、代表取締役：○○）と株式会社△△（本社：東京都○○区、代表取締役：○○）は、○○分野における業務提携契約を○年○月○日付で締結いたしました。"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"提携の背景"}]},{"type":"paragraph","content":[{"type":"text","text":"（提携に至った背景・市場環境についてここに記載）"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"提携の内容"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"内容1：○○"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"内容2：○○"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"内容3：○○"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"各社コメント"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"株式会社○○ 代表取締役 ○○："}]},{"type":"paragraph","content":[{"type":"text","text":"（コメントをここに記載）"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"株式会社△△ 代表取締役 ○○："}]},{"type":"paragraph","content":[{"type":"text","text":"（コメントをここに記載）"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"各社概要"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"株式会社○○"}]},{"type":"paragraph","content":[{"type":"text","text":"所在地：東京都○○区○○\n代表者：代表取締役 ○○\nURL：https://example.com"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"株式会社△△"}]},{"type":"paragraph","content":[{"type":"text","text":"所在地：東京都○○区○○\n代表者：代表取締役 ○○\nURL：https://example.com"}]}]}'
)
ON CONFLICT (id) DO NOTHING;
