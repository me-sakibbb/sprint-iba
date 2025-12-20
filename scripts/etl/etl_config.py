from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class SourceConfig:
    type: str  # "url" or "pdf"
    source: str  # URL or File Path
    # For PDFs
    page_range: Optional[tuple] = None # (start_page, end_page) 0-indexed
    # For URLs
    scraper_type: Optional[str] = None # "examveda", "gmatclub", "generic"
    # Common
    topic: str = "Math"
    subtopic: str = "General"
    difficulty: Optional[str] = None # "Easy", "Medium", "Hard"
    
@dataclass
class ETLConfig:
    jobs: List[SourceConfig] = field(default_factory=list)

def get_config() -> ETLConfig:
    pdf_path = r"C:\Users\DCL\Downloads\Critical-Reasoning-GMAT-OG.pdf"
    return ETLConfig(
        jobs=[
            # Easy Chunk 5-6
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(5, 6),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Easy Chunk 7-8
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(7, 8),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Easy Chunk 9-10
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(9, 10),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Easy Chunk 11-12
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(11, 12),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Easy Chunk 13-14
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(13, 14),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Easy Chunk 15-16
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(15, 16),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Easy Chunk 17-18
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(17, 18),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Easy Chunk 19-20
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(19, 20),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Easy Chunk 21-22
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(21, 22),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Easy Chunk 23-24
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(23, 24),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Easy Chunk 25-26
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(25, 26),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Easy"
            # ),
            # # Medium Chunk 27-28
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(27, 28),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Medium"
            # ),
            # # Medium Chunk 29-30
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(29, 30),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Medium"
            # ),
            # # Medium Chunk 31-32
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(31, 32),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Medium"
            # ),
            # # Medium Chunk 33-34
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(33, 34),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Medium"
            # ),
            # # Medium Chunk 35-36
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(35, 36),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Medium"
            # ),
            # # Medium Chunk 37-38
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(37, 38),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Medium"
            # ),
            # # Medium Chunk 39-40
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(39, 40),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Medium"
            # ),
            # # Medium Chunk 41-42
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(41, 42),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Medium"
            # ),
            # # Medium Chunk 43-44
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(43, 44),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Medium"
            # ),
            # # Medium Chunk 45-46
            # SourceConfig(
            #     type="pdf",
            #     source=pdf_path,
            #     page_range=(45, 46),
            #     topic="Analytical",
            #     subtopic="Critical Reasoning",
            #     difficulty="Medium"
            # ),
            # Medium Chunk 47-48
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(47, 48),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Medium"
            ),
            # Medium Chunk 49-49
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(49, 49),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Medium"
            ),
            # Hard Chunk 50-51
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(50, 51),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 52-53
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(52, 53),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 54-55
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(54, 55),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 56-57
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(56, 57),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 58-59
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(58, 59),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 60-61
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(60, 61),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 62-63
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(62, 63),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 64-65
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(64, 65),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 66-67
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(66, 67),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 68-69
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(68, 69),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 70-71
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(70, 71),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 72-73
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(72, 73),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 74-75
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(74, 75),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 76-77
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(76, 77),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
            # Hard Chunk 78-78
            SourceConfig(
                type="pdf",
                source=pdf_path,
                page_range=(78, 78),
                topic="Analytical",
                subtopic="Critical Reasoning",
                difficulty="Hard"
            ),
        ]
    )
