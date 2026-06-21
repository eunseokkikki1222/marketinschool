const express = require('express');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Toss Payments 테스트 시크릿 키 (실서비스 시 환경변수로 교체)
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R';

// 인메모리 상품 데이터
let items = [
  {
    id: 1,
    title: '거의 새 책 - 미적분학',
    description: '1학기 때 한 번 펼쳐본 미적분학 교재입니다. 깨끗해요!',
    price: 10000,
    contact: '010-1234-5678',
    category: '도서',
    sold: false,
    createdAt: new Date('2026-06-01').toISOString(),
  },
  {
    id: 2,
    title: '아이패드 9세대 64GB',
    description: '1년 사용했습니다. 스크래치 없음. 충전기 포함.',
    price: 350000,
    contact: '카카오톡 ID: school123',
    category: '전자기기',
    sold: false,
    createdAt: new Date('2026-06-10').toISOString(),
  },
  {
    id: 3,
    title: '자전거 (접이식)',
    description: '통학용으로 구매했는데 버스타게 됐어요. 직거래만 가능합니다.',
    price: 80000,
    contact: '010-9876-5432',
    category: '기타',
    sold: false,
    createdAt: new Date('2026-06-15').toISOString(),
  },
];
let nextId = 4;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 상품 목록 조회 (카테고리 필터, 검색 지원)
app.get('/api/items', (req, res) => {
  const { category, q } = req.query;
  let result = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (category && category !== '전체') {
    result = result.filter(item => item.category === category);
  }
  if (q) {
    const keyword = q.toLowerCase();
    result = result.filter(
      item =>
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword)
    );
  }
  res.json(result);
});

// 상품 상세 조회
app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
  res.json(item);
});

// 상품 등록
app.post('/api/items', upload.none(), (req, res) => {
  const { title, description, price, contact, category } = req.body;
  if (!title || !price || !contact) {
    return res.status(400).json({ error: '제목, 가격, 연락처는 필수 입력 항목입니다.' });
  }
  const newItem = {
    id: nextId++,
    title: title.trim(),
    description: (description || '').trim(),
    price: parseInt(price),
    contact: contact.trim(),
    category: category || '기타',
    sold: false,
    createdAt: new Date().toISOString(),
  };
  items.unshift(newItem);
  res.status(201).json(newItem);
});

// 상품 삭제
app.delete('/api/items/:id', (req, res) => {
  const idx = items.findIndex(i => i.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
  items.splice(idx, 1);
  res.json({ success: true });
});

// ── 결제 ──────────────────────────────────────────────

// Toss Payments 결제 승인 확인
app.post('/api/payment/confirm', async (req, res) => {
  const { paymentKey, orderId, amount } = req.body;
  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ error: '결제 정보가 올바르지 않습니다.' });
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(TOSS_SECRET_KEY + ':').toString('base64');
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount: parseInt(amount) }),
    });

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      return res.status(400).json({ error: tossData.message || '결제 승인 실패' });
    }

    // orderId 형식: order_<itemId>_<timestamp>
    const itemIdMatch = orderId.match(/^order_(\d+)_/);
    if (itemIdMatch) {
      const itemId = parseInt(itemIdMatch[1]);
      const item = items.find(i => i.id === itemId);
      if (item) item.sold = true;
    }

    res.json({ success: true, payment: tossData });
  } catch (err) {
    console.error('결제 승인 오류:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 결제 성공 페이지
app.get('/payment/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment-success.html'));
});

// 결제 실패 페이지
app.get('/payment/fail', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment-fail.html'));
});

app.listen(PORT, () => {
  console.log(`MarketInSchool 서버 실행 중: http://localhost:${PORT}`);
});
