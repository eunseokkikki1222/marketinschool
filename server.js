const express = require('express');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// 인메모리 상품 데이터
let items = [
  {
    id: 1,
    title: '거의 새 책 - 미적분학',
    description: '1학기 때 한 번 펼쳐본 미적분학 교재입니다. 깨끗해요!',
    price: 10000,
    contact: '010-1234-5678',
    category: '도서',
    createdAt: new Date('2026-06-01').toISOString(),
  },
  {
    id: 2,
    title: '아이패드 9세대 64GB',
    description: '1년 사용했습니다. 스크래치 없음. 충전기 포함.',
    price: 350000,
    contact: '카카오톡 ID: school123',
    category: '전자기기',
    createdAt: new Date('2026-06-10').toISOString(),
  },
  {
    id: 3,
    title: '자전거 (접이식)',
    description: '통학용으로 구매했는데 버스타게 됐어요. 직거래만 가능합니다.',
    price: 80000,
    contact: '010-9876-5432',
    category: '기타',
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

app.listen(PORT, () => {
  console.log(`MarketInSchool 서버 실행 중: http://localhost:${PORT}`);
});
