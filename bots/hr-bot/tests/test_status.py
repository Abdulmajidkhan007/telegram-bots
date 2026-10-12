import pytest

from hr_bot import status as st


def test_ruxsat_etilgan_otishlar():
    assert st.transition(st.NEW, st.INVITED) == st.INVITED
    assert st.transition(st.NEW, st.SHORTLISTED) == st.SHORTLISTED
    assert st.transition(st.SHORTLISTED, st.REJECTED) == st.REJECTED


@pytest.mark.parametrize("eski,yangi", [
    (st.INVITED, st.REJECTED), (st.REJECTED, st.INVITED), (st.REJECTED, st.NEW),
    (st.SHORTLISTED, st.NEW), (st.NEW, st.NEW), ("noma'lum", st.INVITED),
])
def test_taqiqlangan_otishlar(eski, yangi):
    with pytest.raises(st.TransitionError):
        st.transition(eski, yangi)


def test_qarorsizlar_faqat_new_va_shortlisted():
    assert set(st.UNDECIDED) == {st.NEW, st.SHORTLISTED}
