/**
 * GyanSetu Intelligent Multi-Domain Question Engine
 * Provides comprehensive curated questions across 14 academic & engineering fields,
 * dynamic algorithmic/procedural generators for infinite non-repeating questions,
 * and step-by-step logic explanations for deep learning.
 */

(function(global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  // 1. TOPICS & DOMAIN CATEGORIES METADATA
  // ═══════════════════════════════════════════════════════════════════════
  const TOPICS_METADATA = {
    // ── Tech & Computer Science ──
    'cs-general': {
      group: 'tech',
      name: 'Computer Science (Core)',
      icon: '💻',
      badge: 'CS & Systems',
      desc: 'Operating Systems, DBMS, Computer Networks & System Architecture',
      mode: 'quiz'
    },
    'dsa': {
      group: 'tech',
      name: 'Data Structures & Algorithms',
      icon: '🌳',
      badge: 'DSA & Algorithms',
      desc: 'Trees, Graphs, Dynamic Programming, Sorting & Heaps',
      mode: 'quiz'
    },
    'lang-python': {
      group: 'tech',
      name: 'Python Programming',
      icon: '🐍',
      badge: 'Python (OOP & Core)',
      desc: 'GIL, Decorators, Generators, Metaclasses & Pythonic idioms',
      mode: 'code'
    },
    'lang-javascript': {
      group: 'tech',
      name: 'JavaScript & Web',
      icon: '🟨',
      badge: 'JavaScript (ES6+)',
      desc: 'Event Loop, Closures, Promises, Prototypal Inheritance & DOM',
      mode: 'code'
    },
    'lang-cpp': {
      group: 'tech',
      name: 'C / C++ Systems',
      icon: '⚡',
      badge: 'C / C++',
      desc: 'Pointers, RAII, Smart Pointers, STL, Memory Management & Virtual Tables',
      mode: 'code'
    },
    'lang-java': {
      group: 'tech',
      name: 'Java Enterprise',
      icon: '☕',
      badge: 'Java & JVM',
      desc: 'JVM Memory, Garbage Collection, Multithreading & OOP Design',
      mode: 'code'
    },
    'aiml': {
      group: 'tech',
      name: 'AI & Machine Learning',
      icon: '🤖',
      badge: 'AI & Data Science',
      desc: 'Neural Networks, Backpropagation, Loss Functions, Transformers & Metrics',
      mode: 'quiz'
    },
    'web-backend': {
      group: 'tech',
      name: 'Web & Backend Systems',
      icon: '🌐',
      badge: 'Backend Architecture',
      desc: 'REST APIs, Caching (Redis), Docker, Microservices & SQL vs NoSQL',
      mode: 'quiz'
    },
    'cybersecurity': {
      group: 'tech',
      name: 'Cybersecurity & Cryptography',
      icon: '🛡️',
      badge: 'InfoSec & Crypto',
      desc: 'RSA/AES Encryption, Hashing, XSS, CSRF, SQL Injection & Firewalls',
      mode: 'quiz'
    },

    // ── Engineering & Natural Sciences ──
    'math': {
      group: 'science',
      name: 'Mathematics & Calculus',
      icon: '📐',
      badge: 'Mathematics',
      desc: 'Calculus, Linear Algebra, Determinants, Probability & Matrices',
      mode: 'quiz'
    },
    'physics': {
      group: 'science',
      name: 'Physics & Mechanics',
      icon: '⚛️',
      badge: 'Physics',
      desc: 'Kinematics, Thermodynamics, Electromagnetism & Modern Physics',
      mode: 'quiz'
    },
    'science': {
      group: 'science',
      name: 'General Science & Chemistry',
      icon: '🔬',
      badge: 'Natural Sciences',
      desc: 'Organic Chemistry, Periodic Table, Genetics, Optics & Astronomy',
      mode: 'quiz'
    },

    // ── Aptitude, Logic & General Tech ──
    'aptitude': {
      group: 'aptitude',
      name: 'Campus Aptitude & Logic',
      icon: '🧩',
      badge: 'Aptitude & Reasoning',
      desc: 'Speed Math, Time & Work, Speed & Distance, Profit/Loss & Sequences',
      mode: 'quiz'
    },
    'gk': {
      group: 'aptitude',
      name: 'Tech History & Milestones',
      icon: '🧠',
      badge: 'Tech Pioneers & GK',
      desc: 'Computing Pioneers, Tech Milestones, ISRO Space Missions & Inventions',
      mode: 'quiz'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 2. EXTENSIVE CURATED QUESTION BANK (WITH STEP-BY-STEP LOGIC)
  // ═══════════════════════════════════════════════════════════════════════
  const CURATED_QUESTIONS = {
    // ---------------------------------------------------------------------
    // CS CORE
    // ---------------------------------------------------------------------
    'cs-general': [
      {
        id: 'cs-01',
        difficulty: 1,
        subtopic: 'Data Structures',
        q: "What is the amortized time complexity of appending an element to a Dynamic Array (e.g., std::vector or Python list)?",
        opts: ["O(1) amortized", "O(N) always", "O(log N)", "O(N^2)"],
        ans: 0,
        explanation: {
          concept: "Dynamic Array Geometric Doubling",
          steps: [
            "Step 1: When capacity is available, inserting at the end takes exactly O(1) time.",
            "Step 2: When capacity is full, the array allocates a new buffer of 2x size and copies N elements, costing O(N).",
            "Step 3: However, this resize occurs only once every N inserts. Total work for N appends is ~2N, giving an average (amortized) cost of 2N / N = O(1)."
          ],
          why: "Although occasional resizes cost O(N), the mathematical average per insertion across a sequence of operations is strictly O(1)."
        }
      },
      {
        id: 'cs-02',
        difficulty: 2,
        subtopic: 'Computer Networks',
        q: "In WebRTC and real-time gaming, which protocol provides unreliable, unordered datagrams with minimal transport latency?",
        opts: ["TCP Stream", "SCTP / UDP over DTLS", "HTTP/2 Chunked Stream", "WebSocket Frame"],
        ans: 1,
        explanation: {
          concept: "UDP Datagrams vs TCP Head-of-Line Blocking",
          steps: [
            "Step 1: TCP enforces packet retransmission and in-order delivery, which causes Head-of-Line (HoL) blocking when packets drop.",
            "Step 2: UDP sends packets without connection-oriented handshakes or retransmissions, avoiding latency spikes.",
            "Step 3: WebRTC DataChannels run SCTP encapsulated inside DTLS over UDP to allow sub-millisecond, unordered delivery."
          ],
          why: "For real-time audio/video and multiplayer telemetry, dropping old packets is preferable to stalling the stream waiting for retransmission."
        }
      },
      {
        id: 'cs-03',
        difficulty: 2,
        subtopic: 'DBMS',
        q: "Which SQL transaction isolation level completely prevents Phantom Reads using range locks or MVCC predicate checks?",
        opts: ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"],
        ans: 3,
        explanation: {
          concept: "ACID Isolation Levels & Phantom Records",
          steps: [
            "Step 1: Read Committed allows non-repeatable reads and phantom reads.",
            "Step 2: Repeatable Read locks individual rows already read, but another transaction can insert a new row matching the WHERE clause (a phantom).",
            "Step 3: Serializable is the highest level; it executes transactions as if strictly sequential, locking whole ranges or using multi-version serialization graph checks."
          ],
          why: "Serializable completely eliminates dirty reads, non-repeatable reads, and phantom reads."
        }
      },
      {
        id: 'cs-04',
        difficulty: 2,
        subtopic: 'Operating Systems',
        q: "Which CPU scheduling algorithm theoretically minimizes average waiting time for a static batch of processes?",
        opts: ["First-Come First-Served (FCFS)", "Round Robin (RR)", "Shortest Job First (SJF)", "Priority Scheduling"],
        ans: 2,
        explanation: {
          concept: "SJF Optimality Proof",
          steps: [
            "Step 1: In SJF, processes with shorter burst times execute first.",
            "Step 2: By completing shorter tasks early, subsequent processes spend fewer total cycles waiting in the ready queue.",
            "Step 3: Mathematically, sorting burst times in non-decreasing order minimizes the sum of waiting times: W = sum((N - i) * burst_i)."
          ],
          why: "SJF is provably optimal for minimizing average turnaround and waiting time, though non-preemptive SJF requires knowing burst durations in advance."
        }
      },
      {
        id: 'cs-05',
        difficulty: 3,
        subtopic: 'Distributed Systems',
        q: "In distributed consensus protocols (Raft & Paxos), what is the minimum quorum required to commit a log entry across N nodes?",
        opts: ["100% Unanimous agreement", "Simple Majority: floor(N / 2) + 1", "Two-thirds majority (66%)", "Single Leader confirmation"],
        ans: 1,
        explanation: {
          concept: "Pigeonhole Principle in Quorums",
          steps: [
            "Step 1: To prevent split-brain syndrome where two disjoint sets of nodes make conflicting decisions, quorums must overlap.",
            "Step 2: If a quorum requires at least (N/2 + 1) nodes, any two quorums must share at least one node: (N/2 + 1) + (N/2 + 1) = N + 2 > N.",
            "Step 3: The overlapping node guarantees that the newest term and committed log entries will be visible to any future leader."
          ],
          why: "A simple majority guarantees consistency across node crashes without requiring unanimous availability."
        }
      },
      {
        id: 'cs-06',
        difficulty: 2,
        subtopic: 'Database Architecture',
        q: "What internal composite data structure does Redis utilize for its high-performance sorted sets (ZSET)?",
        opts: ["Red-Black Tree + Linked List", "Skip List + Hash Table", "B+ Tree + Ring Buffer", "Fibonacci Heap + Trie"],
        ans: 1,
        explanation: {
          concept: "Skip List vs Balanced Trees in Memory",
          steps: [
            "Step 1: A Hash Table maps member keys to scores in O(1) time.",
            "Step 2: A Skip List keeps elements ordered by score with probabilistic balancing, allowing O(log N) range queries and insertions.",
            "Step 3: Skip lists require fewer memory rebalancing rotations during concurrent operations than AVL or Red-Black trees."
          ],
          why: "Redis pairs a Hash Table for member lookup with a Skip List for score-based range queries like ZREVRANGE."
        }
      },
      {
        id: 'cs-07',
        difficulty: 1,
        subtopic: 'Operating Systems',
        q: "What condition is NOT one of the 4 Coffman conditions required for a Deadlock to occur?",
        opts: ["Mutual Exclusion", "Hold and Wait", "Preemption of Resources", "Circular Wait"],
        ans: 2,
        explanation: {
          concept: "Coffman Conditions for Deadlock",
          steps: [
            "Step 1: Mutual Exclusion: at least one resource must be non-shareable.",
            "Step 2: Hold and Wait: a process must hold a resource while waiting for another.",
            "Step 3: No Preemption: resources cannot be forcibly seized; only released voluntarily.",
            "Step 4: Circular Wait: a closed chain of processes each waiting for a resource held by the next."
          ],
          why: "Preemption PREVENTS deadlock. The actual Coffman condition is 'No Preemption'."
        }
      },
      {
        id: 'cs-08',
        difficulty: 2,
        subtopic: 'Computer Networks',
        q: "What is the primary purpose of the TCP Three-Way Handshake (SYN -> SYN-ACK -> ACK)?",
        opts: ["Encrypt the packet payload", "Synchronize initial sequence numbers (ISN) and allocate socket buffers", "Determine geographic distance", "Compress data frames"],
        ans: 1,
        explanation: {
          concept: "TCP Connection State Synchronization",
          steps: [
            "Step 1: Client sends SYN with its initial sequence number (ISN_c).",
            "Step 2: Server replies with SYN-ACK, acknowledging ISN_c + 1 and sending its own ISN_s.",
            "Step 3: Client acknowledges ISN_s + 1, confirming both sides have confirmed transmit and receive channels."
          ],
          why: "It establishes mutual verification that both endpoints are ready and synchronizes sequence tracking for reliable packet reordering."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // DSA
    // ---------------------------------------------------------------------
    'dsa': [
      {
        id: 'dsa-01',
        difficulty: 1,
        subtopic: 'Sorting',
        q: "What is the worst-case time complexity of Standard QuickSort with a deterministic first-element pivot?",
        opts: ["O(N log N)", "O(N)", "O(N^2)", "O(log N)"],
        ans: 2,
        explanation: {
          concept: "QuickSort Partitioning Degeneration",
          steps: [
            "Step 1: QuickSort partitions the array around a chosen pivot.",
            "Step 2: If the input is already sorted and the pivot is chosen as the first element, partitions split into sizes 0 and N-1.",
            "Step 3: The recursion tree has depth N, and each level does O(N) comparisons: N + (N-1) + ... + 1 = O(N^2)."
          ],
          why: "Picking a bad pivot on sorted input degrades QuickSort from O(N log N) average to O(N^2) quadratic."
        }
      },
      {
        id: 'dsa-02',
        difficulty: 2,
        subtopic: 'Trees',
        q: "In an AVL balanced search tree, what is the maximum allowed difference between heights of left and right subtrees?",
        opts: ["0 (perfect balance)", "1", "2", "log N"],
        ans: 1,
        explanation: {
          concept: "AVL Balance Factor Definition",
          steps: [
            "Step 1: Balance Factor BF = height(left_child) - height(right_child).",
            "Step 2: An AVL tree strictly enforces that for every node, BF must be -1, 0, or +1.",
            "Step 3: If BF becomes +2 or -2 after an insertion or deletion, tree rotations (LL, RR, LR, RL) rebalance the node in O(1)."
          ],
          why: "Keeping the balance factor strictly <= 1 guarantees height <= 1.44 log2(N), ensuring O(log N) lookup time."
        }
      },
      {
        id: 'dsa-03',
        difficulty: 2,
        subtopic: 'Graphs',
        q: "Which algorithm finds the single-source shortest path in a weighted directed graph with non-negative edge weights in O((V + E) log V)?",
        opts: ["Bellman-Ford", "Dijkstra with Min-Heap", "Floyd-Warshall", "Tarjan's Algorithm"],
        ans: 1,
        explanation: {
          concept: "Dijkstra's Greedy Shortest Path",
          steps: [
            "Step 1: Maintain a priority queue (min-heap) of tentative distances from the source.",
            "Step 2: Greedily extract the unvisited node with minimal distance, relaxing all its adjacent edges.",
            "Step 3: With an indexed binary heap, extracting min takes O(V log V) and edge relaxations take O(E log V)."
          ],
          why: "Dijkstra operates efficiently for non-negative weights; Bellman-Ford is needed only if negative weights exist."
        }
      },
      {
        id: 'dsa-04',
        difficulty: 3,
        subtopic: 'Dynamic Programming',
        q: "What is the time complexity of the classic 0/1 Knapsack problem with N items and maximum weight capacity W?",
        opts: ["O(N log N)", "O(2^N) brute force or O(N * W) pseudo-polynomial", "O(N + W)", "O(W^2)"],
        ans: 1,
        explanation: {
          concept: "Pseudo-Polynomial Dynamic Programming",
          steps: [
            "Step 1: Brute force evaluates all 2^N subsets of items.",
            "Step 2: DP builds an (N+1) x (W+1) matrix where dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w - wt[i]]).",
            "Step 3: Filling this table takes O(N * W) operations. Because W is represented in log(W) bits, it is pseudo-polynomial."
          ],
          why: "The DP table scales with both item count N and integer weight capacity W."
        }
      },
      {
        id: 'dsa-05',
        difficulty: 2,
        subtopic: 'Hash Tables',
        q: "In Robin Hood Hashing, how are collisions resolved during insertion?",
        opts: [
          "Separate chaining with linked lists",
          "Rich nodes give up their slots to poorer nodes with higher probe distances",
          "Double hashing with secondary prime",
          "Rehashing the entire table immediately"
        ],
        ans: 1,
        explanation: {
          concept: "Robin Hood Variance Reduction",
          steps: [
            "Step 1: Each element tracks its Distance from Initial Hash (Displaced Probe Count).",
            "Step 2: When inserting an element with probe count P_new into an occupied slot with probe count P_existing:",
            "Step 3: If P_new > P_existing, the new element steals the slot (taking from the 'rich' low-probe element) and the existing element is pushed forward."
          ],
          why: "This dramatically lowers the maximum probe length and reduces search variance."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // PYTHON
    // ---------------------------------------------------------------------
    'lang-python': [
      {
        id: 'py-01',
        difficulty: 1,
        subtopic: 'Core Python',
        q: "What is the primary role of Python's Global Interpreter Lock (GIL) in CPython?",
        opts: [
          "Speed up multi-threaded CPU tasks across multiple cores",
          "Ensure thread-safe memory management by allowing only one native thread to run bytecode at a time",
          "Compile Python source code directly into native assembly",
          "Provide an encryption lock for proprietary packages"
        ],
        ans: 1,
        explanation: {
          concept: "CPython Memory Architecture & GIL",
          steps: [
            "Step 1: CPython uses reference counting for its garbage collection memory management.",
            "Step 2: Without the GIL, concurrent threads modifying object references could create race conditions and leak memory.",
            "Step 3: The GIL acts as a mutual exclusion lock so that exactly one thread executes Python bytecode inside the CPython process."
          ],
          why: "The GIL protects reference counting data structures, which is why CPU-bound Python tasks use multiprocessing rather than multithreading."
        }
      },
      {
        id: 'py-02',
        difficulty: 2,
        subtopic: 'Generators',
        q: "What happens under the hood when a Python function contains the `yield` keyword?",
        opts: [
          "It executes the entire function and returns a complete list",
          "It returns a Generator iterator that pauses execution and remembers its frame state",
          "It starts a background OS thread",
          "It throws a syntax warning unless decorated with @asyncio"
        ],
        ans: 1,
        explanation: {
          concept: "Generator Object & Frame Suspension",
          steps: [
            "Step 1: Compiling a function with `yield` flags it as a generator function.",
            "Step 2: Calling it does not run the body; it returns a generator object wrapping the execution frame.",
            "Step 3: When `next()` is called, execution advances until the `yield` statement, emits the value, and freezes local variables and instruction pointer."
          ],
          why: "Generators provide memory-efficient lazy evaluation for infinite streams or large datasets."
        }
      },
      {
        id: 'py-03',
        difficulty: 1,
        subtopic: 'Truthiness',
        q: "What will `bool([])` and `bool([0])` evaluate to in Python?",
        opts: ["True and True", "False and True", "False and False", "True and False"],
        ans: 1,
        explanation: {
          concept: "Python Object Truth Value Testing",
          steps: [
            "Step 1: An empty sequence or collection (such as `[]`, `{}`, `set()`, `\"\"`) evaluates to `False`.",
            "Step 2: A non-empty sequence evaluates to `True`, regardless of what items it contains.",
            "Step 3: `[0]` has length 1 (it contains the integer 0), so its truth value is `True`."
          ],
          why: "Container truthiness is determined by length `len(x) > 0`, not the truthiness of the inner items."
        }
      },
      {
        id: 'py-04',
        difficulty: 2,
        subtopic: 'Decorators',
        q: "What does the `@functools.wraps(fn)` decorator preserve when creating custom function decorators?",
        opts: [
          "The CPU execution speed of the original function",
          "The original function's metadata (__name__, __doc__, and signature)",
          "Prevents any arguments from being passed to the wrapper",
          "Auto-caches the return values in Redis"
        ],
        ans: 1,
        explanation: {
          concept: "Introspection & Decorator Metadata",
          steps: [
            "Step 1: Replacing a function with a wrapper assigns wrapper's `__name__` and `__doc__` by default.",
            "Step 2: This breaks debugging tools, Sphinx documentation generators, and logging.",
            "Step 3: `@functools.wraps` copies original docstring, function name, annotations, and module to the wrapper function."
          ],
          why: "It preserves the introspection identity of the wrapped target function."
        }
      },
      {
        id: 'py-05',
        difficulty: 2,
        subtopic: 'Mutable Default Arguments',
        q: "What is the output of calling `append_item(1)` then `append_item(2)` on: `def append_item(x, lst=[]): lst.append(x); return lst`?",
        opts: ["[1] and [2]", "[1] and [1, 2]", "[1, 2] and [1, 2]", "Throws ValueError"],
        ans: 1,
        explanation: {
          concept: "Function Definition Time Object Binding",
          steps: [
            "Step 1: Default parameter values are evaluated once when the function definition is executed, NOT each time the function is called.",
            "Step 2: The empty list `lst=[]` is created once in memory and bound to the function's `__defaults__` attribute.",
            "Step 3: Call 1 appends 1 -> `[1]`. Call 2 reuses the exact same list object and appends 2 -> `[1, 2]`."
          ],
          why: "Mutable default arguments persist between successive invocations. The idiom is to use `lst=None` and initialize inside."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // JAVASCRIPT
    // ---------------------------------------------------------------------
    'lang-javascript': [
      {
        id: 'js-01',
        difficulty: 2,
        subtopic: 'Event Loop',
        q: "In the JavaScript Event Loop, which queue is drained first before processing the next Macrotask (e.g., setTimeout)?",
        opts: [
          "Microtask queue (Promise callbacks, queueMicrotask)",
          "I/O Polling queue",
          "Web Worker background queue",
          "RequestIdleCallback queue"
        ],
        ans: 0,
        explanation: {
          concept: "Microtask vs Macrotask Prioritization",
          steps: [
            "Step 1: Synchronous code on the Call Stack executes to completion.",
            "Step 2: Before the event loop picks the next macrotask (setTimeout, setInterval), it drains the ENTIRE microtask queue.",
            "Step 3: If a microtask schedules another microtask, that new microtask runs in the same cycle before any macrotask."
          ],
          why: "Promise `.then()` and `queueMicrotask()` always take priority over timer callbacks."
        }
      },
      {
        id: 'js-02',
        difficulty: 1,
        subtopic: 'Type Coercion',
        q: "What is the output of `typeof NaN` and `0.1 + 0.2 === 0.3` in standard JavaScript?",
        opts: [
          "'number' and false",
          "'nan' and true",
          "'undefined' and false",
          "'object' and true"
        ],
        ans: 0,
        explanation: {
          concept: "IEEE-754 Floating Point & Special Numbers",
          steps: [
            "Step 1: In ECMAScript, `NaN` (Not a Number) is a numeric data type representing an undefined calculation, so `typeof NaN === 'number'`.",
            "Step 2: Floating point numbers use binary IEEE-754 representation. In binary, 0.1 and 0.2 are repeating fractions.",
            "Step 3: `0.1 + 0.2` equals `0.30000000000000004`, which is strictly not equal to `0.3`."
          ],
          why: "`typeof NaN` is `'number'` and binary floating-point roundoff causes `0.1 + 0.2 !== 0.3`."
        }
      },
      {
        id: 'js-03',
        difficulty: 2,
        subtopic: 'Closures',
        q: "What is a Closure in JavaScript?",
        opts: [
          "A method to close opened network sockets",
          "A function bundled together with references to its surrounding lexical environment",
          "An object with only private symbols",
          "A CSS layout technique"
        ],
        ans: 1,
        explanation: {
          concept: "Lexical Scope & Enclosed Variables",
          steps: [
            "Step 1: In JS, inner functions have access to variables declared in their outer enclosing functions.",
            "Step 2: When the outer function finishes executing, its local scope is usually garbage collected.",
            "Step 3: However, if an inner function survives and references those outer variables, a closure is created, keeping those variables alive in memory."
          ],
          why: "Closures enable data privacy, currying, and stateful factory functions."
        }
      },
      {
        id: 'js-04',
        difficulty: 2,
        subtopic: 'Promises',
        q: "What is the behavior of `Promise.all([p1, p2, p3])` if `p2` rejects after 10ms while `p1` and `p3` resolve after 50ms?",
        opts: [
          "It waits for p1 and p3, then ignores p2",
          "It immediately rejects with p2's error without waiting for p1 and p3 (Fail-Fast)",
          "It resolves with an array containing null for p2",
          "It re-executes p2 three times automatically"
        ],
        ans: 1,
        explanation: {
          concept: "Promise.all Fail-Fast Semantics",
          steps: [
            "Step 1: `Promise.all` requires all promises in the array to resolve for the aggregate promise to resolve.",
            "Step 2: If any single input promise rejects, `Promise.all` immediately rejects with that rejection reason.",
            "Step 3: If you need all results regardless of rejection, use `Promise.allSettled()` instead."
          ],
          why: "`Promise.all` implements fail-fast short-circuiting on the first encountered rejection."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // C / C++
    // ---------------------------------------------------------------------
    'lang-cpp': [
      {
        id: 'cpp-01',
        difficulty: 2,
        subtopic: 'Polymorphism',
        q: "Why should a C++ base class destructor always be declared `virtual` if it has virtual methods?",
        opts: [
          "To speed up compiler optimization",
          "To guarantee that the derived class destructor is invoked when deleting via a base class pointer",
          "To allow destructors to be overloaded with arguments",
          "To allocate the object on heap memory only"
        ],
        ans: 1,
        explanation: {
          concept: "Virtual Destructors & Polymorphic Deletion",
          steps: [
            "Step 1: If you delete a derived object through a base pointer `Base* b = new Derived(); delete b;`:",
            "Step 2: If `~Base()` is non-virtual, the compiler performs static binding and calls ONLY `~Base()`.",
            "Step 3: The `~Derived()` destructor is never invoked, leaking any resources (memory, file handles) allocated by `Derived`."
          ],
          why: "Declaring `virtual ~Base()` ensures dynamic dispatch routes the deletion through the derived destructor first."
        }
      },
      {
        id: 'cpp-02',
        difficulty: 2,
        subtopic: 'Smart Pointers',
        q: "Which C++ smart pointer provides zero-overhead exclusive ownership and cannot be copied, only moved?",
        opts: ["std::shared_ptr", "std::weak_ptr", "std::unique_ptr", "std::auto_ptr"],
        ans: 2,
        explanation: {
          concept: "RAII & std::unique_ptr",
          steps: [
            "Step 1: `std::unique_ptr` manages a raw pointer with exclusive ownership semantics.",
            "Step 2: Its copy constructor and copy assignment operators are explicitly deleted (`= delete`).",
            "Step 3: It has zero runtime overhead compared to a raw pointer because it does not allocate an atomic reference count control block."
          ],
          why: "`std::unique_ptr` enforces move-only semantics with zero reference-counting overhead."
        }
      },
      {
        id: 'cpp-03',
        difficulty: 1,
        subtopic: 'Memory Layout',
        q: "What is `sizeof(EmptyClass)` for `class EmptyClass {};` in standard C++?",
        opts: ["0 bytes", "1 byte (to guarantee distinct memory addresses for instances)", "4 bytes", "8 bytes"],
        ans: 1,
        explanation: {
          concept: "C++ Object Identity Rule",
          steps: [
            "Step 1: In C++, every object must have a unique memory address so pointers `&a == &b` evaluates correctly.",
            "Step 2: If an empty class had size 0, an array of empty classes would have all elements sharing the same address.",
            "Step 3: Therefore, the standard mandates a minimum size of at least 1 byte for empty classes (though Empty Base Optimization can reduce it in inheritance)."
          ],
          why: "C++ mandates at least 1 byte so that distinct instances occupy distinct memory addresses."
        }
      },
      {
        id: 'cpp-04',
        difficulty: 2,
        subtopic: 'Move Semantics',
        q: "What does `std::move(x)` actually do in modern C++ (C++11 and newer)?",
        opts: [
          "Physically moves data across CPU cache lines",
          "Unconditionally casts an expression to an rvalue reference (x&&) to enable move constructors",
          "Zeros out the memory of x immediately",
          "Frees heap allocation of x"
        ],
        ans: 1,
        explanation: {
          concept: "rvalue Reference Casting",
          steps: [
            "Step 1: `std::move` performs NO runtime memory copying or movement.",
            "Step 2: It is a compile-time cast: `static_cast<typename std::remove_reference<T>::type&&>(x)`.",
            "Step 3: Casting to an rvalue reference signals to the compiler that the object's resources can be pilfered by move constructors/assignments."
          ],
          why: "`std::move` merely casts an lvalue into an rvalue reference, allowing efficient resource ownership transfer."
        }
      },
      {
        id: 'cpp-05',
        difficulty: 3,
        subtopic: 'Memory Safety & RAII',
        q: "What fundamental C++ paradigm states that resource acquisition must occur in a constructor and release in its destructor?",
        opts: ["CRTP (Curiously Recurring Template Pattern)", "RAII (Resource Acquisition Is Initialization)", "SFINAE", "PIMPL Idiom"],
        ans: 1,
        explanation: {
          concept: "RAII Guarantee in Exception Safety",
          steps: [
            "Step 1: RAII binds the lifecycle of resources (heap buffers, mutex locks, file handles) to the lifetime of stack objects.",
            "Step 2: When an exception throws or a function returns, the C++ runtime automatically unwinds the stack.",
            "Step 3: Destructors execute deterministically, guaranteeing zero memory leaks."
          ],
          why: "RAII guarantees resource cleanup even in the presence of unhandled exceptions."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // JAVA
    // ---------------------------------------------------------------------
    'lang-java': [
      {
        id: 'java-01',
        difficulty: 1,
        subtopic: 'String Pool',
        q: "Why are `String` objects immutable in Java?",
        opts: [
          "For String Pool caching, security (passwords/network URLs), and thread safety",
          "Because primitive types in Java cannot be altered",
          "Because JVM bytecode does not support string concatenation",
          "To reduce hard disk consumption"
        ],
        ans: 0,
        explanation: {
          concept: "Java String Immutability Benefits",
          steps: [
            "Step 1: Immutability allows Java to cache string literals in the String Intern Pool, saving heap memory.",
            "Step 2: In multithreaded code, immutable strings are automatically thread-safe without locks.",
            "Step 3: Security: Database connection URLs, file paths, and socket ports cannot be maliciously modified after verification."
          ],
          why: "It provides security guarantees, thread safety, and enables the String Constant Pool optimization."
        }
      },
      {
        id: 'java-02',
        difficulty: 2,
        subtopic: 'Concurrency',
        q: "In Java multithreading, what does the `volatile` keyword guarantee?",
        opts: [
          "Atomic increments (e.g., count++) without locks",
          "Memory visibility: writes are flushed to main memory and reads bypass thread-local CPU caches",
          "Prevents the garbage collector from reclaiming the variable",
          "Serializes concurrent method calls"
        ],
        ans: 1,
        explanation: {
          concept: "Java Memory Model (JMM) Happens-Before",
          steps: [
            "Step 1: Each CPU core caches memory variables in L1/L2 caches, causing stale reads between threads.",
            "Step 2: Marking a variable `volatile` establishes a happens-before relationship: writes immediately flush to main memory.",
            "Step 3: However, `volatile` does NOT guarantee atomicity for compound operations like `i++` (read-modify-write)."
          ],
          why: "It provides cross-thread visibility and prevents compiler instruction reordering, but not atomicity."
        }
      },
      {
        id: 'java-03',
        difficulty: 2,
        subtopic: 'JVM Architecture',
        q: "In Java 8+, which memory region replaced PermGen to store class metadata and static structures?",
        opts: ["Java Heap Young Gen", "Metaspace (native process memory)", "Stack Frame", "Code Cache"],
        ans: 1,
        explanation: {
          concept: "PermGen to Metaspace Evolution",
          steps: [
            "Step 1: PermGen had a fixed contiguous size inside the JVM heap, frequently causing `java.lang.OutOfMemoryError: PermGen space`.",
            "Step 2: In Java 8, Metaspace replaced PermGen and allocates dynamically from the OS native memory.",
            "Step 3: Metaspace automatically expands unless capped with `-XX:MaxMetaspaceSize`."
          ],
          why: "Metaspace lives in native memory and scales automatically, preventing static classloader memory exhaustion."
        }
      },
      {
        id: 'java-04',
        difficulty: 2,
        subtopic: 'Collections Contract',
        q: "In Java, what must be true if two objects are considered equal according to `o1.equals(o2)`?",
        opts: [
          "They must have identical memory addresses `o1 == o2`",
          "Their `hashCode()` method MUST return the exact same integer value",
          "They must both implement the Cloneable interface",
          "Their field values must all be primitive types"
        ],
        ans: 1,
        explanation: {
          concept: "equals() and hashCode() Contract",
          steps: [
            "Step 1: If `a.equals(b)` is true, `a.hashCode()` must equal `b.hashCode()`.",
            "Step 2: If this contract is violated, Hash-based collections (HashMap, HashSet) fail to locate stored keys because they lookup the wrong bucket.",
            "Step 3: Note the inverse is not required: two unequal objects CAN share the same hashCode (a collision)."
          ],
          why: "Equal objects must have equal hash codes to ensure proper indexing in hash buckets."
        }
      },
      {
        id: 'java-05',
        difficulty: 2,
        subtopic: 'Data Structures',
        q: "In Java 8, what happens to a `HashMap` bucket when the number of colliding elements exceeds the threshold (TREEIFY_THRESHOLD = 8)?",
        opts: [
          "The bucket converts from a linked list to a balanced Red-Black Tree",
          "The HashMap throws a ConcurrentModificationException",
          "It discards the oldest element",
          "It switches to an array of primitives"
        ],
        ans: 0,
        explanation: {
          concept: "HashMap Treeification",
          steps: [
            "Step 1: Prior to Java 8, colliding elements formed a linked list with worst-case O(N) lookup time.",
            "Step 2: In Java 8, once a bucket has >= 8 items and table capacity is >= 64, it transforms into a Red-Black Tree (TreeNode).",
            "Step 3: This bounds worst-case collision lookup to O(log N) instead of O(N)."
          ],
          why: "Converting to a Red-Black Tree prevents hash-collision denial-of-service degradation."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // AI & MACHINE LEARNING
    // ---------------------------------------------------------------------
    'aiml': [
      {
        id: 'ai-01',
        difficulty: 2,
        subtopic: 'Neural Networks',
        q: "Why is the ReLU activation function (f(x) = max(0, x)) preferred over Sigmoid in deep neural networks?",
        opts: [
          "It outputs values strictly between -1 and 1",
          "It mitigates the Vanishing Gradient problem for positive inputs and computes faster",
          "It is completely differentiable at exactly x = 0",
          "It eliminates the need for backpropagation"
        ],
        ans: 1,
        explanation: {
          concept: "Vanishing Gradient & Saturation Regions",
          steps: [
            "Step 1: The derivative of Sigmoid saturates at both tails (near 0 and 1), where the gradient approaches 0.",
            "Step 2: Multiplying many small gradients (< 0.25) across deep layers causes gradients to vanish, stalling early weights.",
            "Step 3: ReLU has a constant derivative of 1 for all x > 0, allowing gradients to propagate backward without diminishing."
          ],
          why: "ReLU avoids saturation for positive activations and requires only a simple threshold check `x > 0`."
        }
      },
      {
        id: 'ai-02',
        difficulty: 2,
        subtopic: 'Model Evaluation',
        q: "In medical diagnostics where missing a malignant cancer case is catastrophic, which metric should be prioritized?",
        opts: ["Accuracy", "Precision", "Recall (Sensitivity)", "Specificity"],
        ans: 2,
        explanation: {
          concept: "Recall vs False Negatives",
          steps: [
            "Step 1: Recall = TP / (TP + FN), measuring the fraction of actual positive cases successfully detected.",
            "Step 2: A False Negative (FN) means a patient has cancer but the model diagnosed them as healthy.",
            "Step 3: Maximizing Recall minimizes False Negatives, ensuring no sick patient is missed."
          ],
          why: "High Recall ensures that practically all true cases are identified, even if some false alarms require second tests."
        }
      },
      {
        id: 'ai-03',
        difficulty: 3,
        subtopic: 'Transformers',
        q: "What is the computational complexity of the standard Scaled Dot-Product Attention mechanism with respect to sequence length N?",
        opts: ["O(N)", "O(N log N)", "O(N^2)", "O(N^3)"],
        ans: 2,
        explanation: {
          concept: "Full Self-Attention Matrix Multiplication",
          steps: [
            "Step 1: In self-attention, Query (Q) is multiplied by Key (K^T) to compute attention scores.",
            "Step 2: Q is of dimension (N x d) and K is (N x d). The matrix product (Q * K^T) results in an (N x N) attention matrix.",
            "Step 3: Each of the N tokens computes an attention weight with every other token in the sequence, leading to O(N^2 * d) complexity."
          ],
          why: "Every token computes an attention score with every other token, causing quadratic O(N^2) scaling with context window length."
        }
      },
      {
        id: 'ai-04',
        difficulty: 1,
        subtopic: 'Optimization',
        q: "What technique adds an L2 penalty proportional to the square of weight magnitudes (0.5 * lambda * ||w||^2) to prevent overfitting?",
        opts: ["Dropout", "Weight Decay (Ridge Regularization)", "Batch Normalization", "Gradient Clipping"],
        ans: 1,
        explanation: {
          concept: "L2 Regularization / Weight Decay",
          steps: [
            "Step 1: Overfitting models often have excessively large weight values that fit noise in training samples.",
            "Step 2: Adding the L2 norm of weights to the loss function penalizes large coefficients.",
            "Step 3: This drives weights smoothly toward zero, resulting in simpler decision boundaries."
          ],
          why: "L2 regularization prevents individual weights from dominating, smoothing model predictions."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // WEB & BACKEND
    // ---------------------------------------------------------------------
    'web-backend': [
      {
        id: 'web-01',
        difficulty: 2,
        subtopic: 'Architecture',
        q: "What is the primary difference between horizontal scaling and vertical scaling of a backend server?",
        opts: [
          "Horizontal upgrades CPU/RAM on one machine; vertical adds more machines",
          "Horizontal adds more machine instances behind a load balancer; vertical upgrades hardware of an existing machine",
          "Horizontal uses SQL; vertical uses NoSQL",
          "Horizontal is for mobile apps; vertical is for desktop browsers"
        ],
        ans: 1,
        explanation: {
          concept: "Scale-Out vs Scale-Up",
          steps: [
            "Step 1: Vertical scaling (Scale-Up) increases hardware capacity (adding vCPUs, RAM) to a single server.",
            "Step 2: Horizontal scaling (Scale-Out) adds multiple identical nodes running the service in parallel.",
            "Step 3: Horizontal scaling allows near-linear scaling and fault tolerance because traffic distributes across redundant nodes."
          ],
          why: "Horizontal scaling scales out across multiple instances behind a load balancer to avoid single points of failure."
        }
      },
      {
        id: 'web-02',
        difficulty: 2,
        subtopic: 'Caching',
        q: "In the Cache-Aside (Lazy Loading) caching pattern, how does the application handle a read request?",
        opts: [
          "The database writes directly to cache automatically",
          "The app checks cache first; on a cache miss, it reads from the DB, stores the result in cache, and returns it",
          "The cache writes to disk every 5 minutes",
          "The client browser maintains the cache exclusively"
        ],
        ans: 1,
        explanation: {
          concept: "Cache-Aside Pattern Workflow",
          steps: [
            "Step 1: App requests data from cache (e.g., Redis).",
            "Step 2: If found (cache hit), data returns immediately.",
            "Step 3: If not found (cache miss), app queries the primary database, populates the cache with that value + TTL, and returns it."
          ],
          why: "Cache-aside only caches data that is actively requested, preventing cache bloat."
        }
      },
      {
        id: 'web-03',
        difficulty: 1,
        subtopic: 'HTTP Protocol',
        q: "Which HTTP request method is defined by RFC 7231 as both Idempotent and Safe?",
        opts: ["POST", "PUT", "GET", "DELETE"],
        ans: 2,
        explanation: {
          concept: "HTTP Safety & Idempotence",
          steps: [
            "Step 1: Safe methods (GET, HEAD, OPTIONS) do not modify server state.",
            "Step 2: Idempotent methods (GET, PUT, DELETE) produce the same server state whether executed once or ten times.",
            "Step 3: POST is neither safe nor idempotent; PUT is idempotent but not safe. GET is both safe and idempotent."
          ],
          why: "GET simply retrieves a resource representation without mutating server state."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // CYBERSECURITY
    // ---------------------------------------------------------------------
    'cybersecurity': [
      {
        id: 'sec-01',
        difficulty: 2,
        subtopic: 'Cryptography',
        q: "In asymmetric cryptography (such as RSA), which key is used to sign a digital signature, and which key verifies it?",
        opts: [
          "Public key signs; Private key verifies",
          "Private key signs; Public key verifies",
          "A symmetric session key signs and verifies",
          "The CA certificate signs; the browser verifies"
        ],
        ans: 1,
        explanation: {
          concept: "Digital Signature Asymmetry",
          steps: [
            "Step 1: Only the sender possesses their Private Key, guaranteeing non-repudiation.",
            "Step 2: The sender hashes the message and encrypts the hash using their Private Key to create the signature.",
            "Step 3: Anyone with the sender's widely distributed Public Key can decrypt the signature and verify the hash matches."
          ],
          why: "Signing with a private key proves identity because only the legitimate owner holds that key."
        }
      },
      {
        id: 'sec-02',
        difficulty: 1,
        subtopic: 'Web Security',
        q: "How does the `HttpOnly` flag on an authentication cookie protect web applications?",
        opts: [
          "It forces the cookie to be transmitted only over HTTPS connections",
          "It prevents client-side scripts (JavaScript document.cookie) from accessing the cookie, mitigating XSS token theft",
          "It automatically encrypts the database",
          "It disables CORS requests"
        ],
        ans: 1,
        explanation: {
          concept: "Cookie Security Flags",
          steps: [
            "Step 1: In a Cross-Site Scripting (XSS) attack, injected JS scripts attempt to read `document.cookie` to steal session JWTs.",
            "Step 2: When the server sends `Set-Cookie: session=...; HttpOnly`, the browser forbids JavaScript access.",
            "Step 3: The browser still attaches the cookie to outgoing HTTP requests automatically."
          ],
          why: "HttpOnly prevents malicious JavaScript from reading sensitive session tokens."
        }
      },
      {
        id: 'sec-03',
        difficulty: 2,
        subtopic: 'Application Security',
        q: "What is the most effective defense against SQL Injection vulnerabilities?",
        opts: [
          "Blacklisting words like DROP, SELECT, and UNION",
          "Using Parameterized Queries (Prepared Statements) or an ORM",
          "Encrypting user passwords with MD5",
          "Installing an antivirus program on the database server"
        ],
        ans: 1,
        explanation: {
          concept: "Separation of Code and Data in SQL",
          steps: [
            "Step 1: SQL Injection happens when user input is concatenated directly into SQL command strings.",
            "Step 2: Parameterized queries send the SQL statement template to the database engine first for compilation.",
            "Step 3: User inputs are transmitted separately as raw literals, preventing the SQL parser from executing them as code."
          ],
          why: "Prepared statements treat user input strictly as data values, neutralizing SQL syntax injection."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // MATHEMATICS
    // ---------------------------------------------------------------------
    'math': [
      {
        id: 'math-01',
        difficulty: 1,
        subtopic: 'Calculus',
        q: "What is the derivative of f(x) = e^(3x) with respect to x?",
        opts: ["e^(3x)", "3 * e^(3x)", "(1/3) * e^(3x)", "3x * e^(3x - 1)"],
        ans: 1,
        explanation: {
          concept: "Chain Rule for Exponential Functions",
          steps: [
            "Step 1: The derivative of e^u with respect to x is d/dx [e^u] = e^u * (du/dx).",
            "Step 2: Here, u = 3x, so du/dx = 3.",
            "Step 3: Multiplying gives: 3 * e^(3x)."
          ],
          why: "By the chain rule, differentiating the outer exponential retains e^(3x), multiplied by the derivative of the inner exponent 3."
        }
      },
      {
        id: 'math-02',
        difficulty: 1,
        subtopic: 'Probability',
        q: "When rolling two fair standard 6-sided dice, what is the probability that the sum of the numbers equals 7?",
        opts: ["1/12", "1/6 (6 out of 36 outcomes)", "1/7", "5/36"],
        ans: 1,
        explanation: {
          concept: "Discrete Sample Space Probability",
          steps: [
            "Step 1: Total possible outcomes when rolling two dice = 6 * 6 = 36.",
            "Step 2: Pairs that sum to 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) -> exactly 6 favorable outcomes.",
            "Step 3: Probability = Favorable / Total = 6 / 36 = 1/6."
          ],
          why: "7 is the most probable sum when rolling two dice, appearing in 6 of the 36 possible combinations."
        }
      },
      {
        id: 'math-03',
        difficulty: 1,
        subtopic: 'Linear Algebra',
        q: "What is the determinant of the 2x2 matrix M = [[a, b], [c, d]]?",
        opts: ["ab - cd", "ad - bc", "ac - bd", "ad + bc"],
        ans: 1,
        explanation: {
          concept: "2x2 Matrix Determinant Formula",
          steps: [
            "Step 1: The primary diagonal elements are a and d, product = a * d.",
            "Step 2: The anti-diagonal elements are b and c, product = b * c.",
            "Step 3: The determinant is the difference: det(M) = ad - bc."
          ],
          why: "The standard formula for the determinant of a 2x2 matrix is ad - bc."
        }
      },
      {
        id: 'math-04',
        difficulty: 2,
        subtopic: 'Complex Analysis',
        q: "Which fundamental mathematical identity connects e, i, pi, 1, and 0?",
        opts: ["e^(i * pi) + 1 = 0", "pi * r^2 = A", "a^2 + b^2 = c^2", "log(e) = 1"],
        ans: 0,
        explanation: {
          concept: "Euler's Formula & Identity",
          steps: [
            "Step 1: Euler's formula states that e^(i * theta) = cos(theta) + i * sin(theta).",
            "Step 2: Substitute theta = pi: cos(pi) = -1 and sin(pi) = 0.",
            "Step 3: Thus e^(i * pi) = -1. Adding 1 to both sides yields e^(i * pi) + 1 = 0."
          ],
          why: "Euler's identity links five fundamental constants: 0, 1, e, i, and pi."
        }
      },
      {
        id: 'math-05',
        difficulty: 2,
        subtopic: 'Combinatorics',
        q: "In how many distinct ways can 5 books be arranged in a line on a bookshelf (5!)?",
        opts: ["25", "60", "120", "720"],
        ans: 2,
        explanation: {
          concept: "Factorial Permutations",
          steps: [
            "Step 1: The 1st position has 5 choices.",
            "Step 2: The 2nd position has 4 choices remaining, 3rd has 3, 4th has 2, and 5th has 1.",
            "Step 3: Total permutations = 5 * 4 * 3 * 2 * 1 = 120."
          ],
          why: "5! = 120 possible arrangements for 5 distinct items."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // PHYSICS
    // ---------------------------------------------------------------------
    'physics': [
      {
        id: 'phy-01',
        difficulty: 1,
        subtopic: 'Gravitation',
        q: "What is the escape velocity from the surface of planet Earth approximately?",
        opts: ["7.9 km/s", "11.2 km/s", "25.4 km/s", "3.0 x 10^5 km/s"],
        ans: 1,
        explanation: {
          concept: "Gravitational Escape Velocity Formula",
          steps: [
            "Step 1: v_escape = sqrt(2 * G * M / R).",
            "Step 2: Earth mass M = 5.97 x 10^24 kg, radius R = 6.37 x 10^6 m, G = 6.67 x 10^-11.",
            "Step 3: Evaluating the formula yields approximately 11,186 m/s, or 11.2 km/s."
          ],
          why: "11.2 km/s is the minimum initial speed required for an unpropelled ballistic projectile to escape Earth's gravitational field."
        }
      },
      {
        id: 'phy-02',
        difficulty: 2,
        subtopic: 'Fluid Dynamics',
        q: "Which fluid dynamics principle explains why the pressure in a moving fluid decreases as its flow speed increases?",
        opts: ["Pascal's Principle", "Archimedes' Principle", "Bernoulli's Principle", "Hooke's Law"],
        ans: 2,
        explanation: {
          concept: "Conservation of Mechanical Energy in Fluids",
          steps: [
            "Step 1: Bernoulli's equation: P + 0.5 * rho * v^2 + rho * g * h = Constant.",
            "Step 2: In horizontal flow (h is constant), kinetic energy density increases when velocity v increases.",
            "Step 3: To keep the total energy sum constant, static pressure P must decrease."
          ],
          why: "Bernoulli's principle states that an increase in fluid velocity occurs simultaneously with a decrease in static pressure."
        }
      },
      {
        id: 'phy-03',
        difficulty: 2,
        subtopic: 'Modern Physics',
        q: "According to Einstein's explanation of the Photoelectric Effect, what determines the maximum kinetic energy of emitted photoelectrons?",
        opts: [
          "Intensity of the incident light",
          "Frequency of the incident light photons",
          "Total surface area of the illuminated metal",
          "Duration of illumination"
        ],
        ans: 1,
        explanation: {
          concept: "Photon Energy & Work Function",
          steps: [
            "Step 1: Light consists of discrete quanta (photons) with energy E = h * f, where f is frequency.",
            "Step 2: A photoelectron is ejected when it absorbs a single photon: KE_max = h * f - Phi, where Phi is the metal's work function.",
            "Step 3: Increasing light intensity increases photon count (current), but only higher frequency increases individual electron kinetic energy."
          ],
          why: "Kinetic energy depends strictly on photon frequency f; intensity only affects the number of emitted electrons."
        }
      },
      {
        id: 'phy-04',
        difficulty: 2,
        subtopic: 'Quantum Mechanics',
        q: "What does Heisenberg's Uncertainty Principle state cannot be measured simultaneously with arbitrary precision?",
        opts: [
          "Mass and acceleration",
          "Position and momentum of a subatomic particle (Delta x * Delta p >= h_bar / 2)",
          "Charge and electric field",
          "Temperature and volume"
        ],
        ans: 1,
        explanation: {
          concept: "Wave-Particle Duality & Non-Commuting Operators",
          steps: [
            "Step 1: Particles exhibit wave-like characteristics described by wavepackets.",
            "Step 2: Localizing a particle's position Delta x narrows the wavepacket, broadening its constituent spatial frequencies (momentum spread Delta p).",
            "Step 3: Mathematically, Delta x * Delta p >= h / (4 * pi)."
          ],
          why: "The position and momentum operators do not commute, setting a fundamental limit on simultaneous measurement."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // SCIENCE & CHEMISTRY
    // ---------------------------------------------------------------------
    'science': [
      {
        id: 'sci-01',
        difficulty: 1,
        subtopic: 'Genetics',
        q: "What is the double-helical molecular structure of DNA discovered by Watson, Crick, and Franklin in 1953?",
        opts: ["Single alpha-helix", "Double helix with antiparallel strands", "Triple twisted strand", "Planar sheet"],
        ans: 1,
        explanation: {
          concept: "DNA Double Helix Architecture",
          steps: [
            "Step 1: DNA consists of two polynucleotide chains coiling around a common central axis.",
            "Step 2: The strands run antiparallel: one runs 5' to 3' and the other 3' to 5'.",
            "Step 3: Nitrogenous bases face inward, pairing via hydrogen bonds: Adenine with Thymine (2 H-bonds) and Guanine with Cytosine (3 H-bonds)."
          ],
          why: "The antiparallel double helix provides structural stability and a template for replication."
        }
      },
      {
        id: 'sci-02',
        difficulty: 1,
        subtopic: 'Chemistry',
        q: "What is the pH value of pure neutral water at standard room temperature (25°C)?",
        opts: ["0 (strongly acidic)", "7 (neutral)", "14 (strongly alkaline)", "5.5 (weak acid)"],
        ans: 1,
        explanation: {
          concept: "Water Autoionization & pH Scale",
          steps: [
            "Step 1: Pure water self-ionizes: 2 H2O <-> H3O+ + OH-.",
            "Step 2: At 25°C, the ion product Kw = [H3O+] * [OH-] = 1.0 x 10^-14.",
            "Step 3: In neutral water, [H3O+] = 10^-7 mol/L. Therefore, pH = -log10(10^-7) = 7."
          ],
          why: "At 25°C, neutral water has an equal concentration of H+ and OH- ions, yielding a pH of 7."
        }
      },
      {
        id: 'sci-03',
        difficulty: 1,
        subtopic: 'Astronomy',
        q: "Which planet in our Solar System possesses the most extensive and visually prominent planetary ring system?",
        opts: ["Jupiter", "Saturn", "Uranus", "Neptune"],
        ans: 1,
        explanation: {
          concept: "Planetary Ring Systems",
          steps: [
            "Step 1: While Jupiter, Uranus, and Neptune have faint dust rings, Saturn's rings are exceptionally bright and broad.",
            "Step 2: Saturn's rings extend up to 282,000 km from the planet but are mostly only ~10 meters thick.",
            "Step 3: They consist of 99% pure water ice particles with high reflectivity (albedo)."
          ],
          why: "Saturn's rings are composed of reflective water ice, making them the most prominent in the Solar System."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // APTITUDE & LOGICAL REASONING
    // ---------------------------------------------------------------------
    'aptitude': [
      {
        id: 'apt-01',
        difficulty: 1,
        subtopic: 'Time & Work',
        q: "If Person A can finish a work in 10 days and Person B can finish it in 15 days, in how many days can they complete it together?",
        opts: ["5 days", "6 days", "8 days", "12.5 days"],
        ans: 1,
        explanation: {
          concept: "LCM / Unit Rate of Work Method",
          steps: [
            "Step 1: Let total work = LCM(10, 15) = 30 units.",
            "Step 2: A's efficiency = 30 / 10 = 3 units/day. B's efficiency = 30 / 15 = 2 units/day.",
            "Step 3: Combined efficiency = 3 + 2 = 5 units/day.",
            "Step 4: Total days required = 30 / 5 = 6 days."
          ],
          why: "Together they complete 5 units per day, finishing all 30 units in 6 days."
        }
      },
      {
        id: 'apt-02',
        difficulty: 2,
        subtopic: 'Clocks',
        q: "What is the angle between the hour hand and minute hand of an analog clock at 3:15?",
        opts: ["0°", "7.5°", "15°", "22.5°"],
        ans: 1,
        explanation: {
          concept: "Clock Hand Movement Rate",
          steps: [
            "Step 1: The minute hand at 15 minutes points directly at 3 (90° from 12).",
            "Step 2: The hour hand moves 360° / 12 hours = 30° per hour, or 0.5° per minute.",
            "Step 3: In 15 minutes, the hour hand has advanced past 3 by: 15 * 0.5° = 7.5°.",
            "Step 4: Angle between hands = |90° - (90° + 7.5°)| = 7.5°."
          ],
          why: "At 3:15 the hour hand has moved 7.5 degrees past the 3 o'clock mark."
        }
      },
      {
        id: 'apt-03',
        difficulty: 2,
        subtopic: 'Speed & Distance',
        q: "A train 150 meters long is travelling at 54 km/h. How many seconds will it take to completely pass a telegraph pole?",
        opts: ["8 seconds", "10 seconds", "12 seconds", "15 seconds"],
        ans: 1,
        explanation: {
          concept: "Speed Conversion & Point Object Passage",
          steps: [
            "Step 1: Convert speed from km/h to m/s: 54 * (5 / 18) = 3 * 5 = 15 m/s.",
            "Step 2: To cross a stationary point object (pole), the train must travel its own length = 150 meters.",
            "Step 3: Time = Distance / Speed = 150 / 15 = 10 seconds."
          ],
          why: "At 15 m/s, covering 150 meters takes exactly 10 seconds."
        }
      },
      {
        id: 'apt-04',
        difficulty: 1,
        subtopic: 'Number Series',
        q: "Find the next number in the series: 2, 6, 12, 20, 30, ?",
        opts: ["38", "40", "42", "44"],
        ans: 2,
        explanation: {
          concept: "Successive Differences Pattern",
          steps: [
            "Step 1: Find differences between consecutive terms: 6 - 2 = 4, 12 - 6 = 6, 20 - 12 = 8, 30 - 20 = 10.",
            "Step 2: The differences form an arithmetic progression: +4, +6, +8, +10.",
            "Step 3: The next difference must be +12.",
            "Step 4: Next term = 30 + 12 = 42 (also equivalent to n^2 + n: 1*2, 2*3, 3*4, 4*5, 5*6, 6*7 = 42)."
          ],
          why: "Adding the next step (+12) gives 42."
        }
      },
      {
        id: 'apt-05',
        difficulty: 1,
        subtopic: 'Profit & Loss',
        q: "If an item's Cost Price (CP) is ₹200 and Selling Price (SP) is ₹250, what is the profit percentage?",
        opts: ["20%", "25%", "30%", "50%"],
        ans: 1,
        explanation: {
          concept: "Profit Percentage on Cost Basis",
          steps: [
            "Step 1: Profit = Selling Price - Cost Price = 250 - 200 = ₹50.",
            "Step 2: Profit % = (Profit / Cost Price) * 100.",
            "Step 3: Profit % = (50 / 200) * 100 = 1/4 * 100 = 25%."
          ],
          why: "Profit is always calculated relative to the Cost Price (50 / 200 = 25%)."
        }
      }
    ],

    // ---------------------------------------------------------------------
    // GENERAL KNOWLEDGE & TECH HISTORY
    // ---------------------------------------------------------------------
    'gk': [
      {
        id: 'gk-01',
        difficulty: 1,
        subtopic: 'Operating Systems',
        q: "Who initiated and created the first version of the Linux kernel as a student in 1991?",
        opts: ["Steve Wozniak", "Linus Torvalds", "Richard Stallman", "Ken Thompson"],
        ans: 1,
        explanation: {
          concept: "Origins of Open-Source Linux",
          steps: [
            "Step 1: In 1991 at the University of Helsinki, Linus Torvalds wanted an OS kernel for his 80386 PC.",
            "Step 2: He announced the project on the comp.os.minix newsgroup on August 25, 1991.",
            "Step 3: Combined with GNU utilities, it became the foundation of modern Linux distributions."
          ],
          why: "Linus Torvalds created Linux in 1991 and continues to manage kernel releases."
        }
      },
      {
        id: 'gk-02',
        difficulty: 1,
        subtopic: 'Web History',
        q: "In what year and at which research institution did Tim Berners-Lee invent the World Wide Web?",
        opts: ["1975 at Bell Labs", "1983 at MIT", "1989 at CERN", "1995 at Stanford"],
        ans: 2,
        explanation: {
          concept: "World Wide Web Invention",
          steps: [
            "Step 1: In March 1989, Tim Berners-Lee wrote the proposal 'Information Management: A Proposal' at CERN in Switzerland.",
            "Step 2: By 1990, he implemented the first web server (httpd), HTML, and the first web browser (WorldWideWeb).",
            "Step 3: CERN put the web software into the public domain in 1993."
          ],
          why: "The WWW was invented at CERN in 1989 to facilitate automated information-sharing between scientists."
        }
      },
      {
        id: 'gk-03',
        difficulty: 1,
        subtopic: 'Indian Tech & Space',
        q: "Where is the headquarters of the Indian Space Research Organisation (ISRO) situated?",
        opts: ["New Delhi", "Bengaluru, Karnataka", "Hyderabad, Telangana", "Thiruvananthapuram, Kerala"],
        ans: 1,
        explanation: {
          concept: "ISRO Organizational Structure",
          steps: [
            "Step 1: ISRO was formed in 1969 under the leadership of Dr. Vikram Sarabhai.",
            "Step 2: Its apex headquarters (Antariksh Bhavan) is located in Bengaluru, Karnataka.",
            "Step 3: Rocket launches are primarily conducted from Satish Dhawan Space Centre (SDSC) in Sriharikota, Andhra Pradesh."
          ],
          why: "Bengaluru houses ISRO headquarters and primary satellite operations."
        }
      },
      {
        id: 'gk-04',
        difficulty: 1,
        subtopic: 'Computing History',
        q: "Who is celebrated as the Father of Modern Theoretical Computer Science and Artificial Intelligence?",
        opts: ["Charles Babbage", "Alan Turing", "John von Neumann", "Ada Lovelace"],
        ans: 1,
        explanation: {
          concept: "Turing Machine & Computational Foundations",
          steps: [
            "Step 1: Alan Turing formalized the concepts of algorithm and computation with the universal Turing Machine in 1936.",
            "Step 2: He broke the Enigma cipher during WWII at Bletchley Park.",
            "Step 3: In 1950, he proposed the Turing Test for assessing machine intelligence."
          ],
          why: "Alan Turing laid the foundational principles of computability, algorithmic state, and artificial intelligence."
        }
      }
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 3. INFINITE DYNAMIC / PROCEDURAL QUESTION GENERATORS
  // ═══════════════════════════════════════════════════════════════════════
  // Generates infinite unique questions mathematically and programmatically,
  // guaranteeing genuine novel variations on every iteration.
  const PROCEDURAL_GENERATORS = {
    // Dynamic Calculus: Polynomial Differentiation
    'math_derivative': function() {
      const a = Math.floor(Math.random() * 6) + 2; // 2 to 7
      const n = Math.floor(Math.random() * 4) + 2; // 2 to 5
      const b = Math.floor(Math.random() * 8) + 1; // 1 to 8

      const coef = a * n;
      const power = n - 1;
      const powerStr = (power === 1) ? 'x' : `x^${power}`;

      const correctAns = `${coef}${powerStr} + ${b}`;
      const wrong1 = `${a}${powerStr} + ${b}`; // Forgot to multiply coefficient by power
      const wrong2 = `${coef}x^${n} + ${b}`;   // Forgot to reduce power by 1
      const wrong3 = `${coef * 2}${powerStr} + ${b * 2}`; // Scaled wrong

      const opts = shuffleOptions([correctAns, wrong1, wrong2, wrong3]);
      return {
        id: `dyn-math-der-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        isDynamic: true,
        difficulty: 2,
        subtopic: 'Calculus (Power Rule)',
        q: `What is the derivative f'(x) of the polynomial function f(x) = ${a}x^${n} + ${b}x with respect to x?`,
        opts: opts.shuffled,
        ans: opts.correctIndex,
        explanation: {
          concept: "Power Rule & Linearity of Differentiation",
          steps: [
            `Step 1: Apply the power rule d/dx [c * x^n] = c * n * x^(n - 1).`,
            `Step 2: Differentiating first term: d/dx [${a}x^${n}] = ${a} * ${n} * x^(${n} - 1) = ${coef}${powerStr}.`,
            `Step 3: Differentiating linear term: d/dx [${b}x] = ${b}.`,
            `Step 4: Summing derivatives gives: ${correctAns}.`
          ],
          why: `Multiplying by power ${n} gives coefficient ${coef}, and decrementing power yields exponent ${power}.`
        }
      };
    },

    // Dynamic Matrix Determinant
    'math_determinant': function() {
      const a = Math.floor(Math.random() * 8) + 1;
      const b = Math.floor(Math.random() * 6) + 1;
      const c = Math.floor(Math.random() * 5) + 1;
      const d = Math.floor(Math.random() * 9) + 2;

      const det = (a * d) - (b * c);
      const wrong1 = (a * d) + (b * c); // Added instead of subtracted
      const wrong2 = (a * b) - (c * d); // Row product difference
      const wrong3 = det + (Math.random() > 0.5 ? 5 : -4);

      const opts = shuffleOptions([String(det), String(wrong1), String(wrong2), String(wrong3)]);
      return {
        id: `dyn-math-det-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        isDynamic: true,
        difficulty: 2,
        subtopic: 'Matrices (2x2 Determinant)',
        q: `Evaluate the determinant of the 2x2 matrix M = [[${a}, ${b}], [${c}, ${d}]].`,
        opts: opts.shuffled,
        ans: opts.correctIndex,
        explanation: {
          concept: "Formula det(M) = ad - bc",
          steps: [
            `Step 1: Calculate main diagonal product: a * d = ${a} * ${d} = ${a * d}.`,
            `Step 2: Calculate anti-diagonal product: b * c = ${b} * ${c} = ${b * c}.`,
            `Step 3: Subtract: ${a * d} - ${b * c} = ${det}.`
          ],
          why: `The determinant of [[${a}, ${b}], [${c}, ${d}]] is ${a * d} - ${b * c} = ${det}.`
        }
      };
    },

    // Dynamic Aptitude: Time & Work
    'aptitude_time_and_work': function() {
      // Pick clean integer-result pairs
      const pairs = [
        { a: 10, b: 15, res: 6 },
        { a: 12, b: 24, res: 8 },
        { a: 20, b: 30, res: 12 },
        { a: 15, b: 30, res: 10 },
        { a: 6, b: 12, res: 4 },
        { a: 8, b: 24, res: 6 },
        { a: 12, b: 36, res: 9 }
      ];
      const p = pairs[Math.floor(Math.random() * pairs.length)];
      const names = [["Rohan", "Sneha"], ["Arjun", "Priya"], ["Amit", "Neha"], ["Rahul", "Pooja"]];
      const pairNames = names[Math.floor(Math.random() * names.length)];

      const correctAns = `${p.res} days`;
      const wrong1 = `${Math.round((p.a + p.b) / 2)} days`; // Average trap
      const wrong2 = `${p.res + 2} days`;
      const wrong3 = `${Math.max(1, p.res - 2)} days`;

      const opts = shuffleOptions([correctAns, wrong1, wrong2, wrong3]);
      return {
        id: `dyn-apt-work-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        isDynamic: true,
        difficulty: 1,
        subtopic: 'Aptitude (Time & Work)',
        q: `${pairNames[0]} can complete a project in ${p.a} days, and ${pairNames[1]} can complete it in ${p.b} days. If they collaborate together, how many days will it take?`,
        opts: opts.shuffled,
        ans: opts.correctIndex,
        explanation: {
          concept: "Combined Rate of Work Formula: (A * B) / (A + B)",
          steps: [
            `Step 1: ${pairNames[0]}'s 1-day work = 1 / ${p.a}.`,
            `Step 2: ${pairNames[1]}'s 1-day work = 1 / ${p.b}.`,
            `Step 3: Combined 1-day rate = (1 / ${p.a}) + (1 / ${p.b}) = (${p.a} + ${p.b}) / (${p.a} * ${p.b}) = ${p.a + p.b} / ${p.a * p.b}.`,
            `Step 4: Total days required = (${p.a} * ${p.b}) / (${p.a} + ${p.b}) = ${p.a * p.b} / ${p.a + p.b} = ${p.res} days.`
          ],
          why: `Working together adds their daily rates, finishing the task in exactly ${p.res} days.`
        }
      };
    },

    // Dynamic Aptitude: Train Passing Pole
    'aptitude_train_speed': function() {
      const lengths = [120, 150, 180, 200, 240];
      const speedsKmh = [36, 54, 72, 90]; // Multiples of 18 km/h for clean m/s conversion

      const L = lengths[Math.floor(Math.random() * lengths.length)];
      const S_kmh = speedsKmh[Math.floor(Math.random() * speedsKmh.length)];
      const S_ms = S_kmh * (5 / 18); // 10, 15, 20, 25 m/s
      const timeSec = L / S_ms;

      const correctAns = `${timeSec} seconds`;
      const wrong1 = `${timeSec + 4} seconds`;
      const wrong2 = `${Math.max(2, timeSec - 3)} seconds`;
      const wrong3 = `${Math.round(L / S_kmh)} seconds`; // Forgot km/h to m/s conversion!

      const opts = shuffleOptions([correctAns, wrong1, wrong2, wrong3]);
      return {
        id: `dyn-apt-train-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        isDynamic: true,
        difficulty: 2,
        subtopic: 'Aptitude (Speed, Time & Distance)',
        q: `A train of length ${L} meters is travelling at a speed of ${S_kmh} km/h. How many seconds will it take to pass a stationary signal pole?`,
        opts: opts.shuffled,
        ans: opts.correctIndex,
        explanation: {
          concept: "Unit Conversion to SI & Crossing Point Object",
          steps: [
            `Step 1: Convert speed from km/h to m/s by multiplying by 5/18: ${S_kmh} * (5 / 18) = ${S_ms} m/s.`,
            `Step 2: To clear a point object (the pole), the train must traverse its entire length of ${L} meters.`,
            `Step 3: Time = Distance / Speed = ${L} / ${S_ms} = ${timeSec} seconds.`
          ],
          why: `At ${S_ms} m/s, traversing ${L} meters takes exactly ${timeSec} seconds.`
        }
      };
    },

    // Dynamic Python Slice Evaluation
    'python_slicing': function() {
      const lists = [
        [10, 20, 30, 40, 50, 60],
        [1, 3, 5, 7, 9, 11],
        [2, 4, 6, 8, 10, 12]
      ];
      const arr = lists[Math.floor(Math.random() * lists.length)];
      const step = 2;
      const start = Math.floor(Math.random() * 2); // 0 or 1
      const end = arr.length;

      const sliced = arr.slice(start, end).filter((_, i) => i % step === 0);
      const correctAns = JSON.stringify(sliced);
      const wrong1 = JSON.stringify(arr.slice(start, end)); // Ignored step
      const wrong2 = JSON.stringify(arr.filter((_, i) => i % 2 !== 0));
      const wrong3 = JSON.stringify(sliced.slice(0, -1));

      const opts = shuffleOptions([correctAns, wrong1, wrong2, wrong3]);
      return {
        id: `dyn-py-slice-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        isDynamic: true,
        difficulty: 2,
        subtopic: 'Python Slicing [start:end:step]',
        q: `What is the printed output of: <code>nums = ${JSON.stringify(arr)}; print(nums[${start}::${step}])</code>?`,
        opts: opts.shuffled,
        ans: opts.correctIndex,
        explanation: {
          concept: "Python Extended Slice Syntax",
          steps: [
            `Step 1: Syntax is [start:end:step]. Start index is ${start}, step is ${step}.`,
            `Step 2: Starting at index ${start} (value ${arr[start]}), jump ${step} positions forward each iteration.`,
            `Step 3: Selected elements are: ${sliced.join(', ')}.`,
            `Step 4: Output list: ${correctAns}.`
          ],
          why: `Stepping by ${step} selects every second element starting at index ${start}.`
        }
      };
    },

    // Dynamic CS Bitwise Operations
    'cs_bitwise': function() {
      const a = Math.floor(Math.random() * 10) + 4; // 4 to 13
      const shift = Math.floor(Math.random() * 2) + 1; // 1 or 2
      const result = a << shift;

      const correctAns = `${result}`;
      const wrong1 = `${a * shift}`; // Multiplied by shift instead of 2^shift
      const wrong2 = `${result + 2}`;
      const wrong3 = `${a >> shift}`;

      const opts = shuffleOptions([correctAns, wrong1, wrong2, wrong3]);
      return {
        id: `dyn-cs-bit-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        isDynamic: true,
        difficulty: 2,
        subtopic: 'Bitwise Left-Shift Operator (<<)',
        q: `What is the value of the integer expression: <code>${a} << ${shift}</code> in C / Python / JavaScript?`,
        opts: opts.shuffled,
        ans: opts.correctIndex,
        explanation: {
          concept: "Binary Bit Shifting as Multiplication by 2^k",
          steps: [
            `Step 1: Left shifting an integer by k positions (x << k) is equivalent to multiplying by 2^k.`,
            `Step 2: Here k = ${shift}, so 2^${shift} = ${Math.pow(2, shift)}.`,
            `Step 3: Calculation: ${a} * ${Math.pow(2, shift)} = ${result}.`,
            `Step 4: In binary: ${a.toString(2)} << ${shift} = ${result.toString(2)}.`
          ],
          why: `Shifting left by ${shift} bits multiplies ${a} by ${Math.pow(2, shift)} giving ${result}.`
        }
      };
    },

    // Dynamic Physics: Kinetic Energy
    'physics_kinetic_energy': function() {
      const masses = [2, 4, 6, 10]; // kg
      const velocities = [3, 4, 5, 6]; // m/s
      const m = masses[Math.floor(Math.random() * masses.length)];
      const v = velocities[Math.floor(Math.random() * velocities.length)];

      const ke = 0.5 * m * (v * v);
      const correctAns = `${ke} Joules`;
      const wrong1 = `${m * v} Joules`; // Momentum formula trap (p = mv)
      const wrong2 = `${m * (v * v)} Joules`; // Forgot 1/2
      const wrong3 = `${ke + 15} Joules`;

      const opts = shuffleOptions([correctAns, wrong1, wrong2, wrong3]);
      return {
        id: `dyn-phy-ke-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        isDynamic: true,
        difficulty: 1,
        subtopic: 'Mechanics (Kinetic Energy)',
        q: `What is the kinetic energy of an object with a mass of ${m} kg moving at a constant speed of ${v} m/s?`,
        opts: opts.shuffled,
        ans: opts.correctIndex,
        explanation: {
          concept: "Kinetic Energy Formula: KE = (1/2) * m * v^2",
          steps: [
            `Step 1: Formula for translational kinetic energy is KE = 0.5 * mass * velocity^2.`,
            `Step 2: Square velocity: ${v}^2 = ${v * v}.`,
            `Step 3: Multiply by mass: ${m} * ${v * v} = ${m * v * v}.`,
            `Step 4: Multiply by 0.5: 0.5 * ${m * v * v} = ${ke} Joules.`
          ],
          why: `Using KE = 0.5 * m * v^2 gives 0.5 * ${m} * ${v * v} = ${ke} J.`
        }
      };
    },

    // Dynamic Physics: Ohm's Law
    'physics_ohms_law': function() {
      const currents = [2, 3, 4, 5]; // Amperes
      const resistances = [5, 10, 15, 20]; // Ohms
      const I = currents[Math.floor(Math.random() * currents.length)];
      const R = resistances[Math.floor(Math.random() * resistances.length)];

      const V = I * R;
      const correctAns = `${V} Volts`;
      const wrong1 = `${(R / I).toFixed(1)} Volts`;
      const wrong2 = `${I + R} Volts`;
      const wrong3 = `${V * 2} Volts`;

      const opts = shuffleOptions([correctAns, wrong1, wrong2, wrong3]);
      return {
        id: `dyn-phy-ohm-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        isDynamic: true,
        difficulty: 1,
        subtopic: 'Electromagnetism (Ohm\'s Law)',
        q: `According to Ohm's Law, what voltage potential is required to drive an electric current of ${I} A through a resistor of ${R} Ω?`,
        opts: opts.shuffled,
        ans: opts.correctIndex,
        explanation: {
          concept: "Ohm's Law: V = I * R",
          steps: [
            `Step 1: Ohm's Law relates Voltage (V), Current (I), and Resistance (R) by V = I * R.`,
            `Step 2: Substitute given values: I = ${I} A and R = ${R} Ω.`,
            `Step 3: Compute: ${I} * ${R} = ${V} Volts.`
          ],
          why: `V = ${I} A * ${R} Ω = ${V} V.`
        }
      };
    }
  };

  // Helper: Shuffle options array and track new index of correct answer
  function shuffleOptions(options) {
    const originalAnswer = options[0];
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const correctIndex = shuffled.indexOf(originalAnswer);
    return { shuffled, correctIndex };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. SESSION QUEUE & NON-REPEATING STATE TRACKER
  // ═══════════════════════════════════════════════════════════════════════
  const sessionHistory = {
    seenQuestionIds: new Set(),
    servedCounts: {}
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 5. PUBLIC API OF GYANSETU QUESTION ENGINE
  // ═══════════════════════════════════════════════════════════════════════
  const GyanSetuQuestionEngine = {
    // Return all metadata for UI rendering
    getAllTopics() {
      return TOPICS_METADATA;
    },

    getTopicMetadata(topicKey) {
      return TOPICS_METADATA[topicKey] || TOPICS_METADATA['cs-general'];
    },

    getTopicsByGroup(groupName) {
      const result = {};
      for (const [key, meta] of Object.entries(TOPICS_METADATA)) {
        if (!groupName || meta.group === groupName) {
          result[key] = meta;
        }
      }
      return result;
    },

    // Return the question for a given topic and index
    // Ensures questions do not repeat and seamlessly transitions to dynamic generator
    getNextQuestion(topicKey, questionIndex = 0, forceDynamic = false) {
      const curatedList = CURATED_QUESTIONS[topicKey] || [];
      const topicMeta = TOPICS_METADATA[topicKey] || TOPICS_METADATA['cs-general'];

      // If user requested a procedural dynamic question or curated list is exhausted
      if (forceDynamic || questionIndex >= curatedList.length) {
        return this.generateProceduralQuestion(topicKey, questionIndex);
      }

      // Pick next unvisited curated question if possible
      let chosenQ = null;
      for (let i = questionIndex; i < curatedList.length; i++) {
        const candidate = curatedList[i];
        if (!sessionHistory.seenQuestionIds.has(candidate.id)) {
          chosenQ = candidate;
          break;
        }
      }

      // If all curated questions in this topic were already seen, fall back to procedural
      if (!chosenQ) {
        return this.generateProceduralQuestion(topicKey, questionIndex);
      }

      sessionHistory.seenQuestionIds.add(chosenQ.id);

      return {
        ...chosenQ,
        questionNumber: questionIndex + 1,
        topicKey: topicKey,
        topicName: topicMeta.name,
        topicIcon: topicMeta.icon,
        isDynamic: false
      };
    },

    // Procedural question generator mapping per domain
    generateProceduralQuestion(topicKey, questionIndex = 0) {
      let q = null;
      if (topicKey === 'math') {
        q = (Math.random() > 0.5)
          ? PROCEDURAL_GENERATORS['math_derivative']()
          : PROCEDURAL_GENERATORS['math_determinant']();
      } else if (topicKey === 'aptitude') {
        const r = Math.random();
        if (r < 0.5) {
          q = PROCEDURAL_GENERATORS['aptitude_time_and_work']();
        } else {
          q = PROCEDURAL_GENERATORS['aptitude_train_speed']();
        }
      } else if (topicKey === 'lang-python') {
        q = PROCEDURAL_GENERATORS['python_slicing']();
      } else if (topicKey === 'physics') {
        q = (Math.random() > 0.5)
          ? PROCEDURAL_GENERATORS['physics_kinetic_energy']()
          : PROCEDURAL_GENERATORS['physics_ohms_law']();
      } else if (topicKey === 'cs-general' || topicKey === 'dsa') {
        q = PROCEDURAL_GENERATORS['cs_bitwise']();
      } else {
        // Fallback to random math or aptitude logic puzzle
        q = (Math.random() > 0.5)
          ? PROCEDURAL_GENERATORS['aptitude_time_and_work']()
          : PROCEDURAL_GENERATORS['math_derivative']();
      }

      sessionHistory.seenQuestionIds.add(q.id);
      const meta = TOPICS_METADATA[topicKey] || TOPICS_METADATA['cs-general'];

      return {
        ...q,
        questionNumber: questionIndex + 1,
        topicKey: topicKey,
        topicName: meta.name,
        topicIcon: meta.icon
      };
    },

    // Reset history so a new race can start fresh
    resetSession() {
      sessionHistory.seenQuestionIds.clear();
      sessionHistory.servedCounts = {};
    }
  };

  // Expose to window, globalThis, and CommonJS (for Node testability)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GyanSetuQuestionEngine, TOPICS_METADATA, CURATED_QUESTIONS, PROCEDURAL_GENERATORS };
  }
  global.GyanSetuQuestionEngine = GyanSetuQuestionEngine;
  global.QUIZ_TOPICS_ENGINE = TOPICS_METADATA;

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
